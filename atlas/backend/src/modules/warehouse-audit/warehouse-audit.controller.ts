import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WarehouseAuditService } from './warehouse-audit.service';
import { RecordAuditLogDto, WarehouseAuditLogFilterDto } from './dto';
import { WarehouseAuditEntityType } from './interfaces';

@Controller('warehouse-audit')
export class WarehouseAuditController {
  constructor(private readonly service: WarehouseAuditService) {}

  @Post('logs')
  @HttpCode(HttpStatus.CREATED)
  async recordAuditLog(@Body() dto: RecordAuditLogDto) {
    return this.service.recordAuditLog(dto);
  }

  @Get('logs')
  async findAllAuditLogs(@Query() filter: WarehouseAuditLogFilterDto) {
    return this.service.findAllAuditLogs(filter.workspaceId, filter);
  }

  @Get('logs/:id')
  async findAuditLogById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findAuditLogById(id, workspaceId);
  }

  @Get('entity-history/:entityType/:entityId')
  async getEntityHistory(
    @Param('entityType') entityType: WarehouseAuditEntityType,
    @Param('entityId') entityId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getEntityHistory(
      workspaceId,
      entityType,
      entityId,
      limit,
    );
  }

  @Get('suspicious-activities')
  async getSuspiciousActivities(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getSuspiciousActivities(workspaceId, warehouseId, limit);
  }

  @Get('statistics')
  async getAuditStatistics(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAuditStatistics(
      workspaceId,
      warehouseId,
      startDate,
      endDate,
    );
  }
}
