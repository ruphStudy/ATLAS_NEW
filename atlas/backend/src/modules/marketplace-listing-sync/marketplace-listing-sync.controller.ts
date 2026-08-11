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
import { MarketplaceListingSyncService } from './marketplace-listing-sync.service';
import {
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreateListingScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  ListingScheduleResponseDto,
  ListingSyncJobFilterQueryDto,
  ListingSyncJobResponseDto,
  PaginatedListingSyncJobResponseDto,
  RetryFailedListingItemsRequestDto,
  StartListingSyncRequestDto,
  UpdateListingScheduleRequestDto,
} from './dto';

@Controller('marketplace-listing-sync')
export class MarketplaceListingSyncController {
  constructor(private readonly service: MarketplaceListingSyncService) {}

  // ── Sync Jobs ─────────────────────────────────────────────

  @Post('sync')
  async startSync(@Body() dto: StartListingSyncRequestDto): Promise<ListingSyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return ListingSyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ListingSyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return ListingSyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedListingItemsRequestDto): Promise<ListingSyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return ListingSyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: ListingSyncJobFilterQueryDto): Promise<PaginatedListingSyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(ListingSyncJobResponseDto.from),
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
  ): Promise<ListingSyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return ListingSyncJobResponseDto.from(job);
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
    @Param('conflictId') conflictId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ConflictResolutionRequestDto,
  ) {
    return this.service.resolveConflict(conflictId, workspaceId, dto.resolution, dto.resolvedBy, dto.notes);
  }

  // ── Schedules ─────────────────────────────────────────────

  @Post('schedules')
  async createSchedule(@Body() dto: CreateListingScheduleRequestDto): Promise<ListingScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return ListingScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateListingScheduleRequestDto,
  ): Promise<ListingScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return ListingScheduleResponseDto.from(schedule);
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
  ): Promise<ListingScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(ListingScheduleResponseDto.from);
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
