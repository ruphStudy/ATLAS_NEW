import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiMonitoringHealthService } from './ai-monitoring-health.service';
import {
  HealthCheckRequestDto,
  HealthCheckFilterDto,
  HealthIncidentFilterDto,
  UpdateIncidentDto,
  HealthCheckResponseDto,
  PaginatedHealthCheckResponseDto,
  HealthIncidentResponseDto,
  PaginatedHealthIncidentResponseDto,
} from './dto';

@Controller('ai-monitoring-health')
export class AiMonitoringHealthController {
  constructor(private readonly healthService: AiMonitoringHealthService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async performHealthCheck(
    @Body() dto: HealthCheckRequestDto,
  ): Promise<HealthCheckResponseDto> {
    return this.healthService.performHealthCheck(dto);
  }

  @Get('checks')
  async findAllHealthChecks(
    @Query() filter: HealthCheckFilterDto,
  ): Promise<PaginatedHealthCheckResponseDto> {
    return this.healthService.findAllHealthChecks(filter);
  }

  @Get('checks/:id')
  async findHealthCheckById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<HealthCheckResponseDto> {
    return this.healthService.findHealthCheckById(id, workspaceId);
  }

  @Get('incidents')
  async findAllHealthIncidents(
    @Query() filter: HealthIncidentFilterDto,
  ): Promise<PaginatedHealthIncidentResponseDto> {
    return this.healthService.findAllHealthIncidents(filter);
  }

  @Get('incidents/:id')
  async findHealthIncidentById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<HealthIncidentResponseDto> {
    return this.healthService.findHealthIncidentById(id, workspaceId);
  }

  @Patch('incidents/:id')
  async updateIncident(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateIncidentDto,
  ): Promise<HealthIncidentResponseDto> {
    return this.healthService.updateIncident(id, workspaceId, dto);
  }

  @Post('incidents/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveIncident(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<HealthIncidentResponseDto> {
    return this.healthService.resolveIncident(id, workspaceId);
  }

  @Get('summary/provider')
  async getProviderHealthSummary(
    @Query('workspaceId') workspaceId: string,
    @Query('provider') provider: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.healthService.getProviderHealthSummary(
      workspaceId,
      provider,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('summary/model')
  async getModelHealthSummary(
    @Query('workspaceId') workspaceId: string,
    @Query('provider') provider: string,
    @Query('model') model: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.healthService.getModelHealthSummary(
      workspaceId,
      provider,
      model,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('summary/workspace')
  async getWorkspaceHealthSummary(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.healthService.getWorkspaceHealthSummary(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
