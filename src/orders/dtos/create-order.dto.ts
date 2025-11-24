import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsInt, Min, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Record id to order',
    required: true,
    type: String,
    example: '64b7f7e0f1a4b2c3d4e5f6a7',
  })
  @IsMongoId()
  recordId: string;

  @ApiProperty({
    description: 'Quantity of records to order',
    required: true,
    type: Number,
    example: 2,
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  quantity: number;
}
