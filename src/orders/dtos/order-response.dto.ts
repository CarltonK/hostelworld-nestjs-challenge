import { ApiProperty } from '@nestjs/swagger';

export class OrderMetaDto {
  @ApiProperty() totalPrice: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() quantity: number;
  @ApiProperty() status: string;
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() recordId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: OrderMetaDto }) meta: OrderMetaDto;
}
