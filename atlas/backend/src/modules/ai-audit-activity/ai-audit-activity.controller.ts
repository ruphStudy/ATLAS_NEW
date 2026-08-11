import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiAuditActivityService } from './ai-audit-activity.service';
import {
  RecordAuditDto,
  AuditLogFilterDto,
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
} from './dto';

@Controller('ai-audit-activity')
export class AiAuditActivityController {
  constructor(private readonly auditService: AiAuditActivityService) {}

  @Post('record')
  @HttpCode(HttpStatus.CREATED)
  async recordActivity(
    @Body() dto: RecordAuditDto,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.recordActivity(dto);
  }

  @Get('logs')
  async findAllAuditLogs(
    @Query() filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    return this.auditService.findAllAuditLogs(filter);
  }

  @Get('logs/:id')
  async findAuditLogById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AuditLogResponseDto> {
    return this.auditService.findAuditLogById(id, workspaceId);
  }

  @Get('timeline')
  async getActivityTimeline(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getActivityTimeline(
      workspaceId,
      entityType,
      entityId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('suspicious')
  async getSuspiciousActivities(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.auditService.getSuspiciousActivities(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('stats')
  async getWorkspaceStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.auditService.getWorkspaceStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  async archiveOldLogs(
    @Query('workspaceId') workspaceId: string,
    @Query('beforeDate') beforeDate: string,
  ): Promise<{ archived: number }> {
    const count = await this.auditService.archiveOldLogs(
      workspaceId,
      new Date(beforeDate),
    );
    return { archived: count };
  }
}
