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
import { MarketplaceReturnSyncService } from './marketplace-return-sync.service';
import {
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreateReturnScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  PaginatedReturnSyncJobResponseDto,
  RetryFailedReturnItemsRequestDto,
  ReturnScheduleResponseDto,
  ReturnSyncJobFilterQueryDto,
  ReturnSyncJobResponseDto,
  StartReturnSyncRequestDto,
  UpdateReturnScheduleRequestDto,
} from './dto';

@Controller('marketplace-return-sync')
export class MarketplaceReturnSyncController {
  constructor(private readonly service: MarketplaceReturnSyncService) {}

  @Post('sync')
  async startSync(@Body() dto: StartReturnSyncRequestDto): Promise<ReturnSyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return ReturnSyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ReturnSyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return ReturnSyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedReturnItemsRequestDto): Promise<ReturnSyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return ReturnSyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: ReturnSyncJobFilterQueryDto): Promise<PaginatedReturnSyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(ReturnSyncJobResponseDto.from),
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
  ): Promise<ReturnSyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return ReturnSyncJobResponseDto.from(job);
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

  @Get('external-refs/:workspaceId/:accountId')
  async getExternalRefs(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Query() query: ExternalRefFilterQueryDto,
  ) {
    return this.service.getExternalRefs(workspaceId, accountId, query);
  }

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

  @Post('schedules')
  async createSchedule(@Body() dto: CreateReturnScheduleRequestDto): Promise<ReturnScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return ReturnScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateReturnScheduleRequestDto,
  ): Promise<ReturnScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return ReturnScheduleResponseDto.from(schedule);
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
  ): Promise<ReturnScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(ReturnScheduleResponseDto.from);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
