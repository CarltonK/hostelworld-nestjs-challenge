import { Test, TestingModule } from '@nestjs/testing';
import { RecordController } from './record.controller';
import { CreateRecordRequestDTO } from '../dtos/create-record.request.dto';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
import { RecordService } from '../services/record.service';
import { UpdateRecordRequestDTO } from '../dtos/update-record.request.dto';
import { RecordListResponseDto } from '../dtos/paginated-response.dto';

describe('RecordController', () => {
  let recordController: RecordController;
  let service: RecordService;

  const mockRecordService = {
    create: jest.fn(),
    fetchByIdAndUpdate: jest.fn(),
    findAll: jest.fn(),
  };

  const resultId = '6925efa24d9d189640cd394f';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordController],
      providers: [
        {
          provide: RecordService,
          useValue: mockRecordService,
        },
      ],
    }).compile();

    recordController = module.get<RecordController>(RecordController);
    service = module.get<RecordService>(RecordService);

    jest.clearAllMocks();
  });

  it('should create a new record', async () => {
    const dto: CreateRecordRequestDTO = {
      artist: 'Test Artist',
      album: 'Test Album',
      price: 50,
      qty: 5,
      format: RecordFormat.VINYL,
      category: RecordCategory.ROCK,
    };

    const created = { id: resultId, ...dto };
    mockRecordService.create.mockResolvedValue(created);

    const result = await recordController.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });

  it('should update an existing record', async () => {
    const updateDto: UpdateRecordRequestDTO = {
      artist: 'Updated Artist',
    };

    const updatedRecord = {
      id: resultId,
      artist: 'Updated Artist',
      album: 'Old Album',
    };

    mockRecordService.fetchByIdAndUpdate.mockResolvedValue(updatedRecord);

    const result = await recordController.update(resultId, updateDto);

    expect(service.fetchByIdAndUpdate).toHaveBeenCalledWith(
      resultId,
      updateDto,
    );
    expect(result).toEqual(updatedRecord);
  });

  it('should return paginated record list', async () => {
    const filter = { page: 1, limit: 10 };

    const mockResponse: RecordListResponseDto = {
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
      data: [
        { artist: 'A', album: 'A1', price: 10, qty: 1 } as any,
        { artist: 'B', album: 'B1', price: 20, qty: 2 } as any,
      ],
    };

    mockRecordService.findAll.mockResolvedValue(mockResponse);

    const result = await recordController.findAll(filter);

    expect(service.findAll).toHaveBeenCalledWith(filter);
    expect(result).toEqual(mockResponse);
  });
});
