import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LocationPointInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 10.7769 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 106.7009 })
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0, { message: 'Accuracy must be a non-negative number' })
  accuracy!: number;

  @ApiPropertyOptional({ example: 3.2 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Speed must be a non-negative number' })
  speed?: number;

  @ApiPropertyOptional({ example: 90.0 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Heading must be between 0 and 360 degrees' })
  @Max(360, { message: 'Heading must be between 0 and 360 degrees' })
  heading?: number;

  @ApiProperty({ example: '2026-11-05T06:05:00.000Z' })
  @IsDateString()
  recordedAt!: string;
}

export class CreateLocationsBatchDto {
  @ApiProperty({ type: [LocationPointInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointInputDto)
  points!: LocationPointInputDto[];
}

