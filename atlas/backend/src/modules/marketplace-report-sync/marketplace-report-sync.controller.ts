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
import { MarketplaceReportSyncService } from './marketplace-report-sync.service';
import {
  CreateReportScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  PaginatedReportSyncJobResponseDto,
  ReportDocumentFilterQueryDto,
  RetryFailedReportItemsRequestDto,
  ReportScheduleResponseDto,
  ReportSyncJobFilterQueryDto,
  ReportSyncJobResponseDto,
  StartReportSyncRequestDto,
  UpdateReportScheduleRequestDto,
} from './dto';

@Controller('marketplace-report-sync')
export class MarketplaceReportSyncController {
  constructor(private readonly service: MarketplaceReportSyncService) {}

  @Post('sync')
  async startSync(@Body() dto: StartReportSyncRequestDto): Promise<ReportSyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return ReportSyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ReportSyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return ReportSyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedReportItemsRequestDto): Promise<ReportSyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return ReportSyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: ReportSyncJobFilterQueryDto): Promise<PaginatedReportSyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(ReportSyncJobResponseDto.from),
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
  ): Promise<ReportSyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return ReportSyncJobResponseDto.from(job);
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

  @Get('documents/:workspaceId/:accountId')
  async getReportDocuments(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Query() query: ReportDocumentFilterQueryDto,
  ) {
    return this.service.getReportDocuments(workspaceId, accountId, query);
  }

  @Post('schedules')
  async createSchedule(@Body() dto: CreateReportScheduleRequestDto): Promise<ReportScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return ReportScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateReportScheduleRequestDto,
  ): Promise<ReportScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return ReportScheduleResponseDto.from(schedule);
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
  ): Promise<ReportScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(ReportScheduleResponseDto.from);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
