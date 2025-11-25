import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrdersModule } from '../orders.module';
import { RecordModule } from './../../record/record.module';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockSession = {
    withTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockOrderModel = {
    db: {
      startSession: jest.fn().mockResolvedValue(mockSession),
    },
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockRecordModel = {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    mockSession.withTransaction.mockImplementation(async (fn) => fn());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken('Order'), useValue: mockOrderModel },
        { provide: getModelToken('Record'), useValue: mockRecordModel },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException for invalid recordId', async () => {
    await expect(
      service.createOrder({ recordId: 'invalid', quantity: 1 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when record is not found', async () => {
    const validId = new Types.ObjectId().toString();

    mockRecordModel.findById.mockReturnValue({
      session: () => Promise.resolve(null),
    });

    await expect(
      service.createOrder({ recordId: validId, quantity: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when stock is insufficient', async () => {
    const validId = new Types.ObjectId().toString();

    mockRecordModel.findById.mockReturnValue({
      session: () =>
        Promise.resolve({
          qty: 1,
          price: 100,
        }),
    });

    await expect(
      service.createOrder({ recordId: validId, quantity: 5 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully create an order and deduct stock', async () => {
    const validId = new Types.ObjectId().toString();

    const mockRecord = {
      _id: validId,
      qty: 10,
      price: 50,
    };

    // fetch record
    mockRecordModel.findById.mockReturnValue({
      session: () => mockRecord,
    });

    // update stock
    mockRecordModel.findOneAndUpdate.mockReturnValue({
      session: () => ({ ...mockRecord, qty: 5 }),
    });

    // Create the orderr
    const mockCreatedOrder = [{ id: 'order1', ...mockRecord, quantity: 2 }];

    mockOrderModel.create.mockResolvedValue(mockCreatedOrder);

    const result = await service.createOrder({
      recordId: validId,
      quantity: 2,
    });

    expect(result).toEqual(mockCreatedOrder[0]);

    expect(mockRecordModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: validId, qty: { $gte: 2 } },
      { $inc: { qty: -2 } },
      { new: true },
    );

    expect(mockOrderModel.create).toHaveBeenCalled();
  });

  it('should throw BadRequestException if stock update fails', async () => {
    const validId = new Types.ObjectId().toString();
    const mockRecord = { _id: validId, qty: 5, price: 100 };

    mockRecordModel.findById.mockReturnValue({
      session: () => Promise.resolve(mockRecord),
    });

    mockRecordModel.findOneAndUpdate.mockReturnValue({
      session: () => Promise.resolve(null),
    });

    await expect(
      service.createOrder({ recordId: validId, quantity: 3 }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('findById', () => {
    const validId = new Types.ObjectId().toString();

    it('should throw BadRequestException for invalid order id', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderModel.findById = jest.fn(() => ({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      }));

      await expect(service.findById(validId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the order if found', async () => {
      const mockOrder = { _id: validId, quantity: 2, totalPrice: 100 };
      mockOrderModel.findById = jest.fn(() => ({
        lean: () => ({ exec: jest.fn().mockResolvedValue(mockOrder) }),
      }));

      const result = await service.findById(validId);
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException on unexpected error', async () => {
      mockOrderModel.findById = jest.fn(() => ({
        lean: () => ({
          exec: jest.fn().mockRejectedValue(new Error('DB error')),
        }),
      }));

      await expect(service.findById(validId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
