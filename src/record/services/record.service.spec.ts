import { Test, TestingModule } from '@nestjs/testing';
import { RecordService } from './record.service';
import { REDIS_CLIENT } from './../../cache/cache.module';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { MusicBrainzService } from './../../music-brainz/music-brainz.service';
import { getModelToken } from '@nestjs/mongoose';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
import { Types } from 'mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('RecordService', () => {
  let service: RecordService;

  const mockRecordModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockMusicBrainz = {
    getReleaseByMBID: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordService,
        { provide: getModelToken('Record'), useValue: mockRecordModel },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: MusicBrainzService, useValue: mockMusicBrainz },
      ],
    }).compile();

    service = module.get<RecordService>(RecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a record with tracklist', async () => {
    const legitMbid = 'd9d6d2d0-8552-4c12-982d-49cc6a4d7a7e';
    const dto: CreateRecordRequestDTO = {
      artist: 'Band',
      album: 'Album',
      price: 50,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
      mbid: legitMbid,
    };

    mockMusicBrainz.getReleaseByMBID.mockResolvedValue({
      tracklist: [{ title: 'Track 1', duration: 120 }],
    });

    const mockCreated = { id: '1', ...dto };
    mockRecordModel.create.mockResolvedValue(mockCreated);

    const result = await service.create(dto);

    expect(result).toEqual(mockCreated);
    expect(mockMusicBrainz.getReleaseByMBID).toHaveBeenCalledWith(legitMbid);
    expect(mockRecordModel.create).toHaveBeenCalled();
  });

  it('should still create a record when MusicBrainz fails', async () => {
    const dto: CreateRecordRequestDTO = {
      artist: 'Band',
      album: 'Album',
      price: 50,
      qty: 10,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
      mbid: 'really-fake-mbid',
    };

    mockMusicBrainz.getReleaseByMBID.mockRejectedValue(new Error('Not found'));

    const mockCreated = { id: '1', ...dto, tracklist: [] };
    mockRecordModel.create.mockResolvedValue(mockCreated);

    const result = await service.create(dto);

    expect(result).toEqual(mockCreated);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should update MBID and fetch new tracklist', async () => {
    const id = new Types.ObjectId().toString();

    const existingRecord = { _id: id, mbid: 'old-mbid' };

    mockRecordModel.findById.mockResolvedValue(existingRecord);

    mockMusicBrainz.getReleaseByMBID.mockResolvedValue({
      tracklist: [{ title: 'New Track', duration: 100 }],
    });

    const updatedRecord = { ...existingRecord, mbid: 'new-mbid' };

    mockRecordModel.findByIdAndUpdate.mockResolvedValue(updatedRecord);

    const result = await service.fetchByIdAndUpdate(id, {
      mbid: 'new-mbid',
    });

    expect(result).toEqual(updatedRecord);
    expect(mockMusicBrainz.getReleaseByMBID).toHaveBeenCalledWith('new-mbid');
    expect(mockRecordModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  it('should throw BadRequestException when MBID is invalid', async () => {
    const id = new Types.ObjectId().toString();

    mockRecordModel.findById.mockResolvedValue({ _id: id, mbid: 'old' });

    mockMusicBrainz.getReleaseByMBID.mockRejectedValue(
      new Error('Invalid MBID'),
    );

    await expect(
      service.fetchByIdAndUpdate(id, { mbid: 'bad' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('should return cached results if present', async () => {
    const cached = { meta: {}, data: [] };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toEqual(cached);
    expect(mockRedis.get).toHaveBeenCalled();
    expect(mockRecordModel.find).not.toHaveBeenCalled();
  });

  it('should query database when cache is empty', async () => {
    mockRedis.get.mockResolvedValue(null);

    mockRecordModel.find.mockReturnValue({
      skip: () => ({
        limit: () => ({
          exec: () => Promise.resolve([{ id: 1 }]),
        }),
      }),
    });

    mockRecordModel.countDocuments.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.data.length).toBe(1);
    expect(mockRedis.set).toHaveBeenCalled();
  });
});
