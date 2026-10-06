import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KpiManagementService } from './kpi-management.service';
import {
  CreateKpiDefinitionDto,
  UpdateKpiDefinitionDto,
  CalculateKpiDto,
  CreateKpiSnapshotDto,
  CreateKpiGroupDto,
  UpdateKpiGroupDto,
  AcknowledgeKpiAlertDto,
  KpiFilterDto,
  KpiDefinitionResponseDto,
  KpiSnapshotResponseDto,
  KpiVersionResponseDto,
  KpiHistoryResponseDto,
  KpiGroupResponseDto,
  KpiAlertResponseDto,
  KpiCalculationResultResponseDto,
} from './dto';

@Controller('kpi-management')
export class KpiManagementController {
  constructor(private readonly kpiManagementService: KpiManagementService) {}

  @Post('definitions')
  async createDefinition(
    @Body() dto: CreateKpiDefinitionDto,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.createDefinition(dto);
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateKpiDefinitionDto,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.updateDefinition(id, workspaceId, dto);
  }

  @Get('definitions/:id')
  async getDefinitionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.getDefinitionById(id, workspaceId);
  }

  @Get('definitions/key/:kpiKey')
  async getDefinitionByKey(
    @Param('kpiKey') kpiKey: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.getDefinitionByKey(kpiKey, workspaceId);
  }

  @Get('definitions')
  async getAllDefinitions(@Query() filter: KpiFilterDto): Promise<{
    definitions: KpiDefinitionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.kpiManagementService.getAllDefinitions(filter);
  }

  @Post('definitions/:id/enable')
  @HttpCode(HttpStatus.OK)
  async enableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.enableDefinition(id, workspaceId);
  }

  @Post('definitions/:id/disable')
  @HttpCode(HttpStatus.OK)
  async disableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.disableDefinition(id, workspaceId);
  }

  @Post('definitions/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiDefinitionResponseDto> {
    return this.kpiManagementService.archiveDefinition(id, workspaceId);
  }

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  async calculateKpi(
    @Body() dto: CalculateKpiDto,
  ): Promise<KpiCalculationResultResponseDto> {
    return this.kpiManagementService.calculateKpi(dto);
  }

  @Post('snapshots')
  async createSnapshot(
    @Body() dto: CreateKpiSnapshotDto,
  ): Promise<KpiSnapshotResponseDto> {
    return this.kpiManagementService.createSnapshot(dto);
  }

  @Get('definitions/:id/versions')
  async getVersions(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiVersionResponseDto[]> {
    return this.kpiManagementService.getVersions(id, workspaceId);
  }

  @Get('definitions/:id/history')
  async getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ): Promise<KpiHistoryResponseDto[]> {
    return this.kpiManagementService.getHistory(
      id,
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      limit,
    );
  }

  @Post('groups')
  async createGroup(
    @Body() dto: CreateKpiGroupDto,
  ): Promise<KpiGroupResponseDto> {
    return this.kpiManagementService.createGroup(dto);
  }

  @Put('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateKpiGroupDto,
  ): Promise<KpiGroupResponseDto> {
    return this.kpiManagementService.updateGroup(id, workspaceId, dto);
  }

  @Get('groups/:id')
  async getGroupById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<KpiGroupResponseDto> {
    return this.kpiManagementService.getGroupById(id, workspaceId);
  }

  @Get('groups')
  async getAllGroups(
    @Query('workspaceId') workspaceId?: string,
  ): Promise<KpiGroupResponseDto[]> {
    return this.kpiManagementService.getAllGroups(workspaceId);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.kpiManagementService.deleteGroup(id, workspaceId);
  }

  @Get('alerts')
  async getAlerts(
    @Query('workspaceId') workspaceId: string,
    @Query('acknowledged') acknowledged?: boolean,
  ): Promise<KpiAlertResponseDto[]> {
    return this.kpiManagementService.getAlerts(workspaceId, acknowledged);
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeAlert(
    @Param('id') id: string,
    @Body() dto: AcknowledgeKpiAlertDto,
  ): Promise<KpiAlertResponseDto> {
    return this.kpiManagementService.acknowledgeAlert(id, dto);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidated: number }> {
    const count = await this.kpiManagementService.invalidateCache(workspaceId, pattern);
    return { invalidated: count };
  }
}
