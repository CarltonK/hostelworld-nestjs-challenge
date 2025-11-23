import { ApiProperty } from '@nestjs/swagger';
import { Record } from '../schemas/record.schema';

export class PaginationMetaDto {
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPrevPage: boolean;
}

export class RecordListResponseDto {
  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: [Record] })
  data: Record[];
}
