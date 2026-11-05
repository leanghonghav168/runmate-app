import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateLocationsBatchDto } from './dto/create-locations.dto.js';
import { LocationsService } from './locations.service.js';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities/:activityId/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Batch upload GPS location points for an activity' })
  async addPoints(
    @GetUser('id') userId: string,
    @Param('activityId') activityId: string,
    @Body() dto: CreateLocationsBatchDto,
  ) {
    return this.locationsService.addPoints(userId, activityId, dto.points);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve GPS location trail for an activity' })
  async getPoints(
    @GetUser('id') userId: string,
    @Param('activityId') activityId: string,
  ) {
    return this.locationsService.getPoints(userId, activityId);
  }
}

