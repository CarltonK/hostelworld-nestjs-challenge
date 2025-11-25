import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { Order } from '../schemas/order.schema';
import { Record } from '../../record/schemas/record.schema';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('Record') private readonly recordModel: Model<Record>,
  ) {}

  async createOrder(request: CreateOrderDto): Promise<Order> {
    const { recordId, quantity } = request;

    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid recordId');
    }

    const session: ClientSession = await this.orderModel.db.startSession();

    return await session.withTransaction(async () => {
      const record = await this.recordModel.findById(recordId).session(session);

      if (!record) {
        throw new NotFoundException('Record not found');
      }

      if (quantity > record.qty) {
        throw new BadRequestException(
          'Insufficient stock for requested quantity',
        );
      }

      // Pricing
      const unitPrice = record.price;
      const totalPrice = unitPrice * quantity;

      // Stock action - Should be enough before going on
      const stockUpdate = await this.recordModel
        .findOneAndUpdate(
          { _id: recordId, qty: { $gte: quantity } },
          { $inc: { qty: -quantity } },
          { new: true },
        )
        .session(session);

      if (!stockUpdate) {
        throw new BadRequestException('Stock updated — not enough inventory');
      }

      const created = await this.orderModel.create(
        [
          {
            recordId: record._id,
            quantity,
            unitPrice,
            totalPrice,
            status: 'CONFIRMED',
          },
        ],
        { session },
      );

      return created[0];
    });
  }

  async findById(orderId: string) {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id');
    }
    try {
      const order = await this.orderModel.findById(orderId).lean().exec();
      if (!order) throw new NotFoundException('Order not found');
      return order;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }
}
