import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateActivityDto } from '../../activities/dto/create-activity.dto.js';
import { LocationPointInputDto } from '../../locations/dto/create-locations.dto.js';

export class SyncActivityItemDto extends CreateActivityDto {
  @ApiProperty({ type: [LocationPointInputDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointInputDto)
  points?: LocationPointInputDto[];
}

export class SyncPayloadDto {
  @ApiProperty({ type: [SyncActivityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncActivityItemDto)
  activities!: SyncActivityItemDto[];
}

