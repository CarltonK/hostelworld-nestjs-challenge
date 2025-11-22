import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';

export class RecordFilterDto {
  @ApiPropertyOptional({
    description:
      'Search query (search across multiple fields like artist, album, category, etc.)',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by artist name' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  artist?: string;

  @ApiPropertyOptional({ description: 'Filter by album name' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  album?: string;

  @ApiPropertyOptional({
    description: 'Filter by record format (Vinyl, CD, etc.)',
    enum: RecordFormat,
  })
  @IsOptional()
  @IsEnum(RecordFormat)
  format?: RecordFormat;

  @ApiPropertyOptional({
    description: 'Filter by record category (e.g., Rock, Jazz)',
    enum: RecordCategory,
  })
  @IsOptional()
  @IsEnum(RecordCategory)
  category?: RecordCategory;

  @ApiPropertyOptional({
    description: 'Page number for pagination (starts from 1)',
    default: 1,
    minimum: 1,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  @IsNumber()
  limit?: number;
}
