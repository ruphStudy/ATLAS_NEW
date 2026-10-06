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
import { MarketplaceCatalogSyncService } from './marketplace-catalog-sync.service';
import {
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreateScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  PaginatedSyncJobResponseDto,
  RetryFailedItemsRequestDto,
  ScheduleResponseDto,
  StartSyncRequestDto,
  SyncJobFilterQueryDto,
  SyncJobResponseDto,
  UpdateScheduleRequestDto,
} from './dto';

@Controller('marketplace-catalog-sync')
export class MarketplaceCatalogSyncController {
  constructor(private readonly service: MarketplaceCatalogSyncService) {}

  // ── Sync Jobs ─────────────────────────────────────────────

  @Post('sync')
  async startSync(@Body() dto: StartSyncRequestDto): Promise<SyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return SyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<SyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return SyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedItemsRequestDto): Promise<SyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return SyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: SyncJobFilterQueryDto): Promise<PaginatedSyncJobResponseDto> {
    const result = await this.service.findJobs(query);
    return {
      items: result.items.map(SyncJobResponseDto.from),
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
  ): Promise<SyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return SyncJobResponseDto.from(job);
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
    @Param('workspaceId') workspaceId: string,
    @Param('conflictId') conflictId: string,
    @Body() dto: ConflictResolutionRequestDto,
  ) {
    return this.service.resolveConflict(conflictId, workspaceId, dto.resolution, dto.resolvedBy, dto.notes);
  }

  // ── Schedules ─────────────────────────────────────────────

  @Post('schedules')
  async createSchedule(@Body() dto: CreateScheduleRequestDto): Promise<ScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return ScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateScheduleRequestDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return ScheduleResponseDto.from(schedule);
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
  async getSchedules(@Param('workspaceId') workspaceId: string): Promise<ScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(ScheduleResponseDto.from);
  }

  @Post('schedules/:workspaceId/:scheduleId/trigger')
  @HttpCode(HttpStatus.NO_CONTENT)
  async triggerScheduleNow(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.service.triggerScheduleNow(scheduleId, workspaceId);
  }

  // ── Metrics ───────────────────────────────────────────────

  @Get('metrics/:workspaceId/:accountId')
  getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }

  @Get('metrics/:workspaceId')
  getAllMetrics(@Param('workspaceId') workspaceId: string) {
    return this.service.getAllMetrics(workspaceId);
  }
}
