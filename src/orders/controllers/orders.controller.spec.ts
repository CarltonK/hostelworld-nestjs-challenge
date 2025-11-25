import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from '../services/orders.service';
import { CreateOrderDto } from '../dtos/create-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrdersService = {
    createOrder: jest.fn(),
    findById: jest.fn(),
  };

  const orderId = '6925efa24d9d189640cd3954';
  const recordId = '507f191e810c19729de860ea';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);

    jest.clearAllMocks();
  });

  it('should create an order', async () => {
    const dto: CreateOrderDto = { recordId, quantity: 2 };

    const createdOrder = {
      id: orderId,
      recordId: dto.recordId,
      quantity: dto.quantity,
      unitPrice: 20,
      totalPrice: 40,
    };

    mockOrdersService.createOrder.mockResolvedValue(createdOrder);

    const result = await controller.create(dto);

    expect(service.createOrder).toHaveBeenCalledWith(dto);
    expect(result).toEqual(createdOrder);
  });

  it('should fetch a single order by ID', async () => {
    const id = orderId;

    const mockOrder = {
      id,
      recordId,
      quantity: 3,
      totalPrice: 90,
    };

    mockOrdersService.findById.mockResolvedValue(mockOrder);

    const result = await controller.findById(id);

    expect(service.findById).toHaveBeenCalledWith(id);
    expect(result).toEqual(mockOrder);
  });
});
