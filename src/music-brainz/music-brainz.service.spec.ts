import { Test, TestingModule } from '@nestjs/testing';
import { MusicBrainzService } from './music-brainz.service';
import { REDIS_CLIENT } from './../cache/cache.module';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockedAxiosInstance = {
  get: jest.fn(),
};

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockedAxiosInstance),
  },
}));

const legitMbid = 'd9d6d2d0-8552-4c12-982d-49cc6a4d7a7e';

describe('MusicBrainzService', () => {
  let service: MusicBrainzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MusicBrainzService,
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
        { provide: 'winston', useValue: mockLogger },
        { provide: XMLParser, useValue: new XMLParser() },
      ],
    }).compile();

    service = module.get<MusicBrainzService>(MusicBrainzService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw BadRequestException if MBID is missing', async () => {
    await expect(service.getReleaseByMBID('')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should fetch from cache if available', async () => {
    const cachedValue = { mbid: legitMbid, title: 'Test', tracklist: [] };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedValue));

    const result = await service.getReleaseByMBID(legitMbid);

    expect(result).toEqual(cachedValue);
    expect(mockRedisClient.get).toHaveBeenCalledWith(
      `musicbrainz:${legitMbid}`,
    );
  });

  it('should fetch from MusicBrainz and cache result if not in cache', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);

    const xml = `
      <metadata>
        <release id="${legitMbid}">
          <title>Test Album</title>
          <medium-list>
            <medium>
              <track-list>
                <track>
                  <position>1</position>
                  <recording><title>Track 1</title></recording>
                </track>
              </track-list>
            </medium>
          </medium-list>
        </release>
      </metadata>
    `;

    mockedAxiosInstance.get.mockResolvedValueOnce({ data: xml });

    const result = await service.getReleaseByMBID(legitMbid);

    expect(result.mbid).toBe(legitMbid);
    expect(result.title).toBe('Test Album');
    expect(result.tracklist.length).toBe(1);
    expect(mockRedisClient.set).toHaveBeenCalled();
  });

  it('should refetch from MusicBrainz if cached value is corrupted', async () => {
    mockRedisClient.get.mockResolvedValueOnce('not-json');
    const xml = `
    <metadata>
      <release id="${legitMbid}">
        <title>Test Album</title>
        <medium-list>
          <medium>
            <track-list>
              <track>
                <position>1</position>
                <recording><title>Track 1</title></recording>
              </track>
            </track-list>
          </medium>
        </medium-list>
      </release>
    </metadata>
  `;
    mockedAxiosInstance.get.mockResolvedValueOnce({ data: xml });

    const result = await service.getReleaseByMBID(legitMbid);

    expect(result.title).toBe('Test Album');
    expect(mockRedisClient.del).toHaveBeenCalledWith(
      `musicbrainz:${legitMbid}`,
    );
    expect(mockRedisClient.set).toHaveBeenCalled();
  });

  it('should throw NotFoundException if MBID not found', async () => {
    mockedAxiosInstance.get.mockRejectedValueOnce({
      response: { status: 404 },
    });

    await expect(service.getReleaseByMBID('nonexistent')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ServiceUnavailableException on network error', async () => {
    mockedAxiosInstance.get.mockRejectedValueOnce({ code: 'ECONNREFUSED' });

    await expect(service.getReleaseByMBID('123')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException on 429 rate limit', async () => {
    mockedAxiosInstance.get.mockRejectedValueOnce({
      response: { status: 429 },
    });

    await expect(service.getReleaseByMBID(legitMbid)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw BadRequestException if XML is invalid', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);
    mockedAxiosInstance.get.mockResolvedValueOnce({ data: '<invalid><xml>' });

    await expect(service.getReleaseByMBID(legitMbid)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should handle tracks with missing title gracefully', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);
    const xml = `
    <metadata>
      <release id="${legitMbid}">
        <title>Test Album</title>
        <medium-list>
          <medium>
            <track-list>
              <track><position>1</position></track>
            </track-list>
          </medium>
        </medium-list>
      </release>
    </metadata>
  `;
    mockedAxiosInstance.get.mockResolvedValueOnce({ data: xml });

    const result = await service.getReleaseByMBID(legitMbid);
    expect(result.tracklist.length).toBe(0);
  });
});
