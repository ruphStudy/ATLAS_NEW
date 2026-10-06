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
import { MarketplaceShipmentSyncService } from './marketplace-shipment-sync.service';
import {
  ConflictFilterQueryDto,
  ConflictResolutionRequestDto,
  CreateShipmentScheduleRequestDto,
  ExternalRefFilterQueryDto,
  ItemResultFilterQueryDto,
  PaginatedShipmentSyncJobResponseDto,
  RetryFailedShipmentItemsRequestDto,
  ShipmentScheduleResponseDto,
  ShipmentSyncJobFilterQueryDto,
  ShipmentSyncJobResponseDto,
  StartShipmentSyncRequestDto,
  UpdateShipmentScheduleRequestDto,
} from './dto';

@Controller('marketplace-shipment-sync')
export class MarketplaceShipmentSyncController {
  constructor(private readonly service: MarketplaceShipmentSyncService) {}

  @Post('sync')
  async startSync(@Body() dto: StartShipmentSyncRequestDto): Promise<ShipmentSyncJobResponseDto> {
    const job = await this.service.startSync(dto);
    return ShipmentSyncJobResponseDto.from(job);
  }

  @Post('sync/:workspaceId/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSync(
    @Param('jobId') jobId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ShipmentSyncJobResponseDto> {
    const job = await this.service.cancelSync(jobId, workspaceId);
    return ShipmentSyncJobResponseDto.from(job);
  }

  @Post('sync/retry')
  async retryFailedItems(@Body() dto: RetryFailedShipmentItemsRequestDto): Promise<ShipmentSyncJobResponseDto> {
    const job = await this.service.retryFailedItems(dto);
    return ShipmentSyncJobResponseDto.from(job);
  }

  @Get('jobs')
  async findJobs(@Query() query: ShipmentSyncJobFilterQueryDto): Promise<PaginatedShipmentSyncJobResponseDto> {
    const result = await this.service.findJobs(query as any);
    return {
      items: result.items.map(ShipmentSyncJobResponseDto.from),
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
  ): Promise<ShipmentSyncJobResponseDto> {
    const job = await this.service.getJob(jobId, workspaceId);
    return ShipmentSyncJobResponseDto.from(job);
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
  async createSchedule(@Body() dto: CreateShipmentScheduleRequestDto): Promise<ShipmentScheduleResponseDto> {
    const schedule = await this.service.createSchedule(dto);
    return ShipmentScheduleResponseDto.from(schedule);
  }

  @Patch('schedules/:workspaceId/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateShipmentScheduleRequestDto,
  ): Promise<ShipmentScheduleResponseDto> {
    const schedule = await this.service.updateSchedule(scheduleId, workspaceId, dto as unknown as Record<string, unknown>);
    return ShipmentScheduleResponseDto.from(schedule);
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
  ): Promise<ShipmentScheduleResponseDto[]> {
    const schedules = await this.service.getSchedules(workspaceId);
    return schedules.map(ShipmentScheduleResponseDto.from);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
