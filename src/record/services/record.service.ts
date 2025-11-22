import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Record } from '../schemas/record.schema';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { UpdateRecordRequestDTO } from '../dtos/update-record.request.dto';

export type RecordFilterOpts = {
  page?: number;
  limit?: number;
} & FilterQuery<Record>;

@Injectable()
export class RecordService {
  constructor(
    @InjectModel('Record') private readonly recordModel: Model<Record>,
  ) {}

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
    const allRecords = await this.recordModel.find().exec();

    const { album, q, format, category, artist } = filterOpts;

    const filteredRecords = allRecords.filter((record) => {
      let match = true;

      if (q) {
        match =
          match &&
          (record.artist.includes(q) ||
            record.album.includes(q) ||
            record.category.includes(q));
      }

      if (artist) {
        match = match && record.artist.includes(artist);
      }

      if (album) {
        match = match && record.album.includes(album);
      }

      if (format) {
        match = match && record.format === format;
      }

      if (category) {
        match = match && record.category === category;
      }

      return match;
    });

    return filteredRecords;
  }
}
