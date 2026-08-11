import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsFoundationService } from './analytics-foundation.service';
import {
  RegisterAnalyticsEntityDto,
  UpdateAnalyticsEntityDto,
  AnalyticsEntityResponseDto,
  RegisterAnalyticsDimensionDto,
  UpdateAnalyticsDimensionDto,
  AnalyticsDimensionResponseDto,
  RegisterAnalyticsMetricDto,
  UpdateAnalyticsMetricDto,
  AnalyticsMetricResponseDto,
  ExecuteAnalyticsQueryDto,
  AnalyticsQueryResultDto,
  RegisterAnalyticsKpiDto,
  UpdateAnalyticsKpiDto,
  AnalyticsKpiResponseDto,
  CreateAnalyticsSnapshotDto,
  AnalyticsSnapshotResponseDto,
  CreateAnalyticsConfigurationDto,
  UpdateAnalyticsConfigurationDto,
  AnalyticsConfigurationResponseDto,
} from './dto';

@Controller('analytics-foundation')
export class AnalyticsFoundationController {
  constructor(
    private readonly analyticsService: AnalyticsFoundationService,
  ) {}

  @Post('entities')
  @HttpCode(HttpStatus.CREATED)
  async registerEntity(
    @Body() dto: RegisterAnalyticsEntityDto,
  ): Promise<AnalyticsEntityResponseDto> {
    return this.analyticsService.registerEntity(dto);
  }

  @Get('entities/:id')
  async getEntity(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsEntityResponseDto> {
    return this.analyticsService.getEntity(id, workspaceId);
  }

  @Get('entities')
  async listEntities(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<AnalyticsEntityResponseDto[]> {
    return this.analyticsService.listEntities(workspaceId, {
      entityType,
      isActive,
    });
  }

  @Put('entities/:id')
  async updateEntity(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAnalyticsEntityDto,
  ): Promise<AnalyticsEntityResponseDto> {
    return this.analyticsService.updateEntity(id, workspaceId, dto);
  }

  @Delete('entities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntity(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteEntity(id, workspaceId);
  }

  @Post('dimensions')
  @HttpCode(HttpStatus.CREATED)
  async registerDimension(
    @Body() dto: RegisterAnalyticsDimensionDto,
  ): Promise<AnalyticsDimensionResponseDto> {
    return this.analyticsService.registerDimension(dto);
  }

  @Get('dimensions/:id')
  async getDimension(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsDimensionResponseDto> {
    return this.analyticsService.getDimension(id, workspaceId);
  }

  @Get('dimensions')
  async listDimensions(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<AnalyticsDimensionResponseDto[]> {
    return this.analyticsService.listDimensions(workspaceId, {
      entityType,
      isActive,
    });
  }

  @Put('dimensions/:id')
  async updateDimension(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAnalyticsDimensionDto,
  ): Promise<AnalyticsDimensionResponseDto> {
    return this.analyticsService.updateDimension(id, workspaceId, dto);
  }

  @Delete('dimensions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDimension(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteDimension(id, workspaceId);
  }

  @Post('metrics')
  @HttpCode(HttpStatus.CREATED)
  async registerMetric(
    @Body() dto: RegisterAnalyticsMetricDto,
  ): Promise<AnalyticsMetricResponseDto> {
    return this.analyticsService.registerMetric(dto);
  }

  @Get('metrics/:id')
  async getMetric(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsMetricResponseDto> {
    return this.analyticsService.getMetric(id, workspaceId);
  }

  @Get('metrics')
  async listMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<AnalyticsMetricResponseDto[]> {
    return this.analyticsService.listMetrics(workspaceId, {
      entityType,
      isActive,
    });
  }

  @Put('metrics/:id')
  async updateMetric(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAnalyticsMetricDto,
  ): Promise<AnalyticsMetricResponseDto> {
    return this.analyticsService.updateMetric(id, workspaceId, dto);
  }

  @Delete('metrics/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMetric(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteMetric(id, workspaceId);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  async executeQuery(
    @Body() dto: ExecuteAnalyticsQueryDto,
  ): Promise<AnalyticsQueryResultDto> {
    return this.analyticsService.executeQuery(dto);
  }

  @Post('kpis')
  @HttpCode(HttpStatus.CREATED)
  async registerKpi(
    @Body() dto: RegisterAnalyticsKpiDto,
  ): Promise<AnalyticsKpiResponseDto> {
    return this.analyticsService.registerKpi(dto);
  }

  @Get('kpis/:id')
  async getKpi(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsKpiResponseDto> {
    return this.analyticsService.getKpi(id, workspaceId);
  }

  @Get('kpis')
  async listKpis(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<AnalyticsKpiResponseDto[]> {
    return this.analyticsService.listKpis(workspaceId, {
      entityType,
      isActive,
    });
  }

  @Put('kpis/:id')
  async updateKpi(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAnalyticsKpiDto,
  ): Promise<AnalyticsKpiResponseDto> {
    return this.analyticsService.updateKpi(id, workspaceId, dto);
  }

  @Delete('kpis/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKpi(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteKpi(id, workspaceId);
  }

  @Post('snapshots')
  @HttpCode(HttpStatus.CREATED)
  async createSnapshot(
    @Body() dto: CreateAnalyticsSnapshotDto,
  ): Promise<AnalyticsSnapshotResponseDto> {
    return this.analyticsService.createSnapshot(dto);
  }

  @Get('snapshots/:id')
  async getSnapshot(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsSnapshotResponseDto> {
    return this.analyticsService.getSnapshot(id, workspaceId);
  }

  @Get('snapshots')
  async listSnapshots(
    @Query('snapshotKey') snapshotKey: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ): Promise<AnalyticsSnapshotResponseDto[]> {
    return this.analyticsService.listSnapshots(snapshotKey, workspaceId, limit);
  }

  @Delete('snapshots/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSnapshot(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteSnapshot(id, workspaceId);
  }

  @Post('configurations')
  @HttpCode(HttpStatus.CREATED)
  async createConfiguration(
    @Body() dto: CreateAnalyticsConfigurationDto,
  ): Promise<AnalyticsConfigurationResponseDto> {
    return this.analyticsService.createConfiguration(dto);
  }

  @Get('configurations/:id')
  async getConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AnalyticsConfigurationResponseDto> {
    return this.analyticsService.getConfiguration(id, workspaceId);
  }

  @Get('configurations')
  async listConfigurations(
    @Query('workspaceId') workspaceId: string,
    @Query('entityType') entityType?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<AnalyticsConfigurationResponseDto[]> {
    return this.analyticsService.listConfigurations(workspaceId, {
      entityType,
      isActive,
    });
  }

  @Put('configurations/:id')
  async updateConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAnalyticsConfigurationDto,
  ): Promise<AnalyticsConfigurationResponseDto> {
    return this.analyticsService.updateConfiguration(id, workspaceId, dto);
  }

  @Delete('configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.analyticsService.deleteConfiguration(id, workspaceId);
  }
}
