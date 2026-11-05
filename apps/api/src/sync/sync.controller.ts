import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { SyncPayloadDto } from './dto/sync-payload.dto.js';
import { SyncService } from './sync.service.js';

@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({ summary: 'Batch synchronize offline activities and GPS points' })
  async syncBatch(
    @GetUser('id') userId: string,
    @Body() dto: SyncPayloadDto,
  ) {
    return this.syncService.syncBatch(userId, dto);
  }
}

