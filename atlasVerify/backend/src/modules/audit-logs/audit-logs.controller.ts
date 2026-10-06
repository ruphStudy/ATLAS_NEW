import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserRole } from '@common/decorators';
import { AuditLogsService } from './audit-logs.service';
import {
  RecordAuditLogDto,
  AuditLogFilterDto,
  ExportAuditLogDto,
  AuditLogEntryResponseDto,
  PaginatedAuditLogEntryResponseDto,
  AuditExportResponseDto,
} from './dto';

@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async record(@Body() dto: RecordAuditLogDto): Promise<AuditLogEntryResponseDto> {
    return (await this.auditLogsService.record(dto)) as unknown as AuditLogEntryResponseDto;
  }

  @Get('export')
  async exportLogs(
    @WorkspaceId() workspaceId: string,
    @UserRole() userRole: string,
    @Query() dto: ExportAuditLogDto,
  ): Promise<AuditExportResponseDto> {
    return this.auditLogsService.exportLogs(workspaceId, userRole, dto);
  }

  @Get('entities/:entityType/:entityId')
  async findEntityHistory(
    @WorkspaceId() workspaceId: string,
    @UserRole() userRole: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    return this.auditLogsService.findEntityHistory(workspaceId, userRole, entityType, entityId, filter);
  }

  @Get('actors/:actorId')
  async findActorHistory(
    @WorkspaceId() workspaceId: string,
    @UserRole() userRole: string,
    @Param('actorId') actorId: string,
    @Query() filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    return this.auditLogsService.findActorHistory(workspaceId, userRole, actorId, filter);
  }

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @UserRole() userRole: string,
    @Query() filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    return this.auditLogsService.findAll(workspaceId, userRole, filter);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserRole() userRole: string,
  ): Promise<AuditLogEntryResponseDto> {
    return (await this.auditLogsService.findById(
      id,
      workspaceId,
      userRole,
    )) as unknown as AuditLogEntryResponseDto;
  }
}
