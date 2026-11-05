import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityStatus, ActivityType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateActivityDto {
  @ApiPropertyOptional({ description: 'Client-generated UUID for offline synchronization' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: ActivityType, example: ActivityType.RUNNING })
  @IsEnum(ActivityType)
  activityType!: ActivityType;

  @ApiPropertyOptional({ enum: ActivityStatus, default: ActivityStatus.IN_PROGRESS })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({ example: 5200 })
  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 2.89 })
  @IsOptional()
  @IsNumber()
  averageSpeed?: number;

  @ApiPropertyOptional({ example: 4.2 })
  @IsOptional()
  @IsNumber()
  maxSpeed?: number;

  @ApiPropertyOptional({ example: 5.76 })
  @IsOptional()
  @IsNumber()
  averagePace?: number;

  @ApiProperty({ example: '2026-11-05T06:00:00.000Z' })
  @IsDateString()
  startedAt!: string;

  @ApiPropertyOptional({ example: '2026-11-05T06:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}

