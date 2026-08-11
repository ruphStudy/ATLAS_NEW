import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReorderManagementService } from './reorder-management.service';
import {
  CreateReorderConfigurationDto,
  UpdateReorderConfigurationDto,
  ApproveRecommendationDto,
  RejectRecommendationDto,
  SnoozeRecommendationDto,
  ResolveRecommendationDto,
  ReorderConfigurationFilterDto,
  ReorderRecommendationFilterDto,
} from './dto';

@Controller('reorder-management')
export class ReorderManagementController {
  constructor(private readonly service: ReorderManagementService) {}

  @Post('configurations')
  @HttpCode(HttpStatus.CREATED)
  async createConfiguration(
    @Body() dto: CreateReorderConfigurationDto,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.createConfiguration(workspaceId, dto);
  }

  @Get('configurations')
  async findAllConfigurations(@Query() filter: ReorderConfigurationFilterDto) {
    return this.service.findAllConfigurations(filter.workspaceId, filter);
  }

  @Get('configurations/:id')
  async findConfigurationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findConfigurationById(id, workspaceId);
  }

  @Patch('configurations/:id')
  @HttpCode(HttpStatus.OK)
  async updateConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateReorderConfigurationDto,
  ) {
    return this.service.updateConfiguration(id, workspaceId, dto);
  }

  @Delete('configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteConfiguration(id, workspaceId);
  }

  @Get('recommendations')
  async findAllRecommendations(@Query() filter: ReorderRecommendationFilterDto) {
    return this.service.findAllRecommendations(filter.workspaceId, filter);
  }

  @Get('recommendations/:id')
  async findRecommendationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findRecommendationById(id, workspaceId);
  }

  @Patch('recommendations/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveRecommendation(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ApproveRecommendationDto,
  ) {
    return this.service.approve(id, workspaceId, dto);
  }

  @Patch('recommendations/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRecommendation(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RejectRecommendationDto,
  ) {
    return this.service.reject(id, workspaceId, dto);
  }

  @Patch('recommendations/:id/snooze')
  @HttpCode(HttpStatus.OK)
  async snoozeRecommendation(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: SnoozeRecommendationDto,
  ) {
    return this.service.snooze(id, workspaceId, dto);
  }

  @Patch('recommendations/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveRecommendation(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ResolveRecommendationDto,
  ) {
    return this.service.resolve(id, workspaceId, dto);
  }

  @Post('recommendations/expire-old')
  @HttpCode(HttpStatus.OK)
  async expireOldRecommendations(@Query('workspaceId') workspaceId: string) {
    const count = await this.service.expireOldRecommendations(workspaceId);
    return { expired: count };
  }
}
