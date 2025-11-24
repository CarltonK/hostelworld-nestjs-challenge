import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOrderDto } from '../dtos/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order for a record' })
  @ApiResponse({ status: 201, description: 'Record successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async create(@Body() request: CreateOrderDto) {
    return await this.ordersService.createOrder(request);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order by ID' })
  @ApiResponse({ status: 200, description: 'Order found and returned' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  async findById(@Param('id') id: string) {
    return await this.ordersService.findById(id);
  }
}
