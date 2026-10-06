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
import { MarketplacePricingSyncService } from './marketplace-pricing-sync.service';
import {
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreatePriceScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  PaginatedPriceSyncJobResponseDto,
  RetryFailedPriceItemsRequestDto,
  PriceScheduleResponseDto,
  PriceSyncJobFilterQueryDto,
  PriceSyncJobResponseDto,
  StartPriceSyncRequestDto,
  UpdatePriceScheduleRequestDto,
} from './dto';

@Controller('marketplace-pricing-sync')
export class MarketplacePricingSyncController {
  constructor(private readonly service: MarketplacePricingSyncService) {}

  @Post('sync')
  async startSync(@Body() dto: StartPriceSyncRequestDto): Promise<PriceSyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return PriceSyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<PriceSyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return PriceSyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedPriceItemsRequestDto): Promise<PriceSyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return PriceSyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: PriceSyncJobFilterQueryDto): Promise<PaginatedPriceSyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(PriceSyncJobResponseDto.from),
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
  ): Promise<PriceSyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return PriceSyncJobResponseDto.from(job);
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
  async createSchedule(@Body() dto: CreatePriceScheduleRequestDto): Promise<PriceScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return PriceScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdatePriceScheduleRequestDto,
  ): Promise<PriceScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto);
    return PriceScheduleResponseDto.from(schedule);
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
  ): Promise<PriceScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(PriceScheduleResponseDto.from);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
