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
import { WarehouseSyncService } from './warehouse-sync.service';
import {
  CreateWarehouseSyncConfigurationDto,
  UpdateWarehouseSyncConfigurationDto,
  TriggerSyncJobDto,
  PauseSyncJobDto,
  ResumeSyncJobDto,
  CancelSyncJobDto,
  ResolveConflictDto,
  WarehouseSyncConfigurationFilterDto,
  WarehouseSyncJobFilterDto,
  WarehouseSyncConflictFilterDto,
} from './dto';

@Controller('warehouse-sync')
export class WarehouseSyncController {
  constructor(private readonly service: WarehouseSyncService) {}

  @Post('configurations')
  @HttpCode(HttpStatus.CREATED)
  async createConfiguration(
    @Body() dto: CreateWarehouseSyncConfigurationDto,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.createConfiguration(workspaceId, dto);
  }

  @Get('configurations')
  async findAllConfigurations(@Query() filter: WarehouseSyncConfigurationFilterDto) {
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
    @Body() dto: UpdateWarehouseSyncConfigurationDto,
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

  @Post('jobs/trigger')
  @HttpCode(HttpStatus.CREATED)
  async triggerSyncJob(
    @Body() dto: TriggerSyncJobDto,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.triggerSyncJob(workspaceId, dto);
  }

  @Get('jobs')
  async findAllJobs(@Query() filter: WarehouseSyncJobFilterDto) {
    return this.service.findAllJobs(filter.workspaceId, filter);
  }

  @Get('jobs/:id')
  async findJobById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findJobById(id, workspaceId);
  }

  @Get('jobs/:id/progress')
  async getSyncProgress(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getSyncProgress(id, workspaceId);
  }

  @Patch('jobs/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSyncJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: PauseSyncJobDto,
  ) {
    return this.service.pauseSyncJob(id, workspaceId, dto);
  }

  @Patch('jobs/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSyncJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ResumeSyncJobDto,
  ) {
    return this.service.resumeSyncJob(id, workspaceId, dto);
  }

  @Patch('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSyncJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CancelSyncJobDto,
  ) {
    return this.service.cancelSyncJob(id, workspaceId, dto);
  }

  @Get('conflicts')
  async findAllConflicts(@Query() filter: WarehouseSyncConflictFilterDto) {
    return this.service.findAllConflicts(filter.workspaceId, filter);
  }

  @Get('conflicts/:id')
  async findConflictById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findConflictById(id, workspaceId);
  }

  @Patch('conflicts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveConflict(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.service.resolveConflict(id, workspaceId, dto);
  }
}
