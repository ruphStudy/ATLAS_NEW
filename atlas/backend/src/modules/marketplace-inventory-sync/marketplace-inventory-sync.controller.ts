import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceInventorySyncService } from './marketplace-inventory-sync.service';
import {
  AdjustmentFilterQueryDto,
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreateInventoryScheduleRequestDto,
  ExternalRefFilterQueryDto,
  InventoryScheduleResponseDto,
  InventorySyncJobFilterQueryDto,
  InventorySyncJobResponseDto,
  ItemResultFilterQueryDto,
  PaginatedInventorySyncJobResponseDto,
  RetryFailedInventoryItemsRequestDto,
  StartInventorySyncRequestDto,
  UpdateInventoryScheduleRequestDto,
} from './dto';

@Controller('marketplace-inventory-sync')
export class MarketplaceInventorySyncController {
  constructor(private readonly service: MarketplaceInventorySyncService) {}

  // ── Sync Jobs ─────────────────────────────────────────────

  @Post('sync')
  async startSync(@Body() dto: StartInventorySyncRequestDto): Promise<InventorySyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return InventorySyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<InventorySyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return InventorySyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedInventoryItemsRequestDto): Promise<InventorySyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return InventorySyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: InventorySyncJobFilterQueryDto): Promise<PaginatedInventorySyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(InventorySyncJobResponseDto.from),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('jobs/:workspaceId/:jobId')
  async getJob(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<InventorySyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return InventorySyncJobResponseDto.from(job);
  }

  @Get('jobs/:workspaceId/:jobId/progress')
  async getJobProgress(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.getJobProgress(jobId, workspaceId);
  }

  @Get('jobs/:workspaceId/:jobId/items')
  async getItemResults(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() query: ItemResultFilterQueryDto,
  ) {
    return this.service.getItemResults(jobId, workspaceId, query);
  }

  // ── External Refs ─────────────────────────────────────────

  @Get('external-refs/:workspaceId/:accountId')
  async getExternalRefs(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Query() query: ExternalRefFilterQueryDto,
  ) {
    return this.service.getExternalRefs(workspaceId, accountId, query);
  }

  // ── Adjustments ───────────────────────────────────────────

  @Get('adjustments/:workspaceId')
  async getAdjustments(
    @Param('workspaceId') workspaceId: string,
    @Query() query: AdjustmentFilterQueryDto,
  ) {
    return this.service.getAdjustments(workspaceId, query);
  }

  // ── Conflicts ─────────────────────────────────────────────

  @Get('conflicts/:workspaceId')
  async getConflicts(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ConflictFilterQueryDto,
  ) {
    return this.service.getConflicts(workspaceId, query);
  }

  @Post('conflicts/:workspaceId/:conflictId/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveConflict(
    @Param('conflictId') conflictId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ConflictResolutionRequestDto,
  ) {
    return this.service.resolveConflict(conflictId, workspaceId, dto.resolution, dto.resolvedBy, dto.notes);
  }

  // ── Schedules ─────────────────────────────────────────────

  @Post('schedules')
  async createSchedule(@Body() dto: CreateInventoryScheduleRequestDto): Promise<InventoryScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return InventoryScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateInventoryScheduleRequestDto,
  ): Promise<InventoryScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return InventoryScheduleResponseDto.from(schedule);
  }

  @Delete('schedules/:workspaceId/:scheduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.service.deleteSchedule(scheduleId, workspaceId);
  }

  @Get('schedules/:workspaceId')
  async getSchedules(
    @Param('workspaceId') workspaceId: string,
  ): Promise<InventoryScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(InventoryScheduleResponseDto.from);
  }

  @Post('schedules/:workspaceId/:scheduleId/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerScheduleNow(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.service.triggerScheduleNow(scheduleId, workspaceId);
  }

  // ── Metrics ───────────────────────────────────────────────

  @Get('metrics/:workspaceId/:accountId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }

  @Get('metrics/:workspaceId')
  async getAllMetrics(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.getAllMetrics(workspaceId);
  }
}
