import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Record } from '../schemas/record.schema';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from '../dtos/update-record.request.dto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './../../cache/cache.module';

export type RecordFilterOpts = {
  page?: number;
  limit?: number;
} & FilterQuery<Record>;

@Injectable()
export class RecordService {
  constructor(
    @InjectModel('Record') private readonly recordModel: Model<Record>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) { }

  async create(request: CreateRecordRequestDTO) {
    try {
      await this.recordModel.create({
        artist: request.artist,
        album: request.album,
        price: request.price,
        qty: request.qty,
        format: request.format,
        category: request.category,
        mbid: request.mbid,
      });
    } catch (error) {
      throw new InternalServerErrorException(error?.message);
    }
  }

  async fetchByIdAndUpdate(
    id: string,
    updateRecordDto: UpdateRecordRequestDTO,
  ) {
    try {
      const record = await this.recordModel.findById(id);
      if (!record) {
        throw new InternalServerErrorException('Record not found');
      }

      Object.assign(record, updateRecordDto);

      const updated = await this.recordModel.updateOne(record);
      if (!updated) {
        throw new InternalServerErrorException('Failed to update record');
      }

      return record;
    } catch (error) {
      throw new InternalServerErrorException(error?.message);
    }
  }

  async findAll(filterOpts: RecordFilterOpts) {
    const { album, q, format, category, artist, page, limit } = filterOpts;

    // Cache first before resorting to DB
    const cacheKey = `records:${JSON.stringify(filterOpts)}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Base filter query
    const query: FilterQuery<Record> = {};
    const insensitive = { $options: 'i' };

    // Text search over regex search to improve performance in bigger data sets
    if (q) query.$text = { $search: q };

    // Field-specific filters
    if (artist) query.artist = { $regex: artist, ...insensitive };
    if (album) query.album = { $regex: album, ...insensitive };

    // Exact match filters - Enum based
    if (format) query.format = format;
    if (category) query.category = category;

    // Pagination
    const skip = (page - 1) * limit;

    try {
      const [records, total] = await Promise.all([
        this.recordModel.find(query).skip(skip).limit(limit).exec(),
        this.recordModel.countDocuments(query),
      ]);

      const response = {
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
        data: records,
      };

      // Cache response for next time
      await this.redis.set(cacheKey, JSON.stringify(response), 'PX', 30000);

      return response;
    } catch (error) {
      throw new NotFoundException(error?.message);
    }
  }
}
