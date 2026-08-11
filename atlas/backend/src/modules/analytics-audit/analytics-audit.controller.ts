import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsAuditService } from './analytics-audit.service';
import {
  RecordAuditDto,
  BulkRecordAuditDto,
  AuditFilterDto,
  EntityTimelineDto,
  ArchiveOldRecordsDto,
  AnalyticsAuditRecordResponseDto,
  AuditTimelineResponseDto,
  SuspiciousActivityResponseDto,
  PaginatedAuditRecordResponseDto,
  AuditStatisticsDto,
} from './dto';

@Controller('analytics-audit')
export class AnalyticsAuditController {
  constructor(private readonly analyticsAuditService: AnalyticsAuditService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordAudit(@Body() dto: RecordAuditDto): Promise<AnalyticsAuditRecordResponseDto> {
    return this.analyticsAuditService.recordAudit(dto);
  }

  @Post('record/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkRecordAudit(@Body() dto: BulkRecordAuditDto): Promise<AnalyticsAuditRecordResponseDto[]> {
    return this.analyticsAuditService.bulkRecordAudit(dto);
  }

  @Get(':id')
  async getAuditRecordById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsAuditRecordResponseDto> {
    return this.analyticsAuditService.getAuditRecordById(id, workspaceId);
  }

  @Get()
  async getAllAuditRecords(@Query() filter: AuditFilterDto): Promise<PaginatedAuditRecordResponseDto> {
    return this.analyticsAuditService.getAllAuditRecords(filter);
  }

  @Get('correlation/:correlationId')
  async getByCorrelationId(
    @Param('correlationId') correlationId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsAuditRecordResponseDto[]> {
    return this.analyticsAuditService.getByCorrelationId(correlationId, workspaceId);
  }

  @Post('timeline')
  @HttpCode(HttpStatus.OK)
  async getEntityTimeline(@Body() dto: EntityTimelineDto): Promise<AuditTimelineResponseDto> {
    return this.analyticsAuditService.getEntityTimeline(dto);
  }

  @Get('entity/:entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsAuditRecordResponseDto[]> {
    return this.analyticsAuditService.getEntityHistory(workspaceId, entityType, entityId);
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  async archiveOldRecords(@Body() dto: ArchiveOldRecordsDto): Promise<{ archived: number }> {
    return this.analyticsAuditService.archiveOldRecords(dto);
  }

  @Delete('archived')
  @HttpCode(HttpStatus.OK)
  async deleteArchivedRecords(
    @Query('workspaceId') workspaceId: string,
    @Query('beforeDate') beforeDate: string,
  ): Promise<{ deleted: number }> {
    return this.analyticsAuditService.deleteArchivedRecords(
      workspaceId,
      new Date(beforeDate),
    );
  }

  @Get('suspicious/activities')
  async getSuspiciousActivities(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SuspiciousActivityResponseDto[]> {
    return this.analyticsAuditService.getSuspiciousActivities(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('statistics/summary')
  async getStatistics(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditStatisticsDto> {
    return this.analyticsAuditService.getStatistics(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
