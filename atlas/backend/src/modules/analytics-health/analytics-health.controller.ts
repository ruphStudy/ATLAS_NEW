import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsHealthService } from './analytics-health.service';
import {
  PerformHealthCheckDto,
  GetWorkspaceHealthDto,
  GetServiceHealthDto,
  ReportIncidentDto,
  ResolveIncidentDto,
  GetHealthHistoryDto,
  ServiceHealthResponseDto,
  WorkspaceHealthSummaryResponseDto,
  SystemHealthSummaryResponseDto,
  HealthCheckResponseDto,
  HealthIncidentResponseDto,
  OperationStatusResponseDto,
} from './dto';

@Controller('analytics-health')
export class AnalyticsHealthController {
  constructor(private readonly analyticsHealthService: AnalyticsHealthService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  async performHealthCheck(@Body() dto: PerformHealthCheckDto): Promise<HealthCheckResponseDto> {
    return this.analyticsHealthService.performHealthCheck(dto);
  }

  @Get('workspace/:workspaceId')
  async getWorkspaceHealth(
    @Param('workspaceId') workspaceId: string,
    @Query('includeHistory') includeHistory?: boolean,
  ): Promise<WorkspaceHealthSummaryResponseDto> {
    return this.analyticsHealthService.getWorkspaceHealth({
      workspaceId,
      includeHistory,
    });
  }

  @Get('system')
  async getSystemHealth(): Promise<SystemHealthSummaryResponseDto> {
    return this.analyticsHealthService.getSystemHealth();
  }

  @Post('service')
  @HttpCode(HttpStatus.OK)
  async getServiceHealth(@Body() dto: GetServiceHealthDto): Promise<ServiceHealthResponseDto> {
    return this.analyticsHealthService.getServiceHealth(dto);
  }

  @Post('incidents')
  @HttpCode(HttpStatus.CREATED)
  async reportIncident(@Body() dto: ReportIncidentDto): Promise<HealthIncidentResponseDto> {
    return this.analyticsHealthService.reportIncident(dto);
  }

  @Put('incidents/:incidentId/resolve')
  async resolveIncident(
    @Param('incidentId') incidentId: string,
    @Body() dto: Omit<ResolveIncidentDto, 'incidentId'>,
  ): Promise<HealthIncidentResponseDto> {
    return this.analyticsHealthService.resolveIncident({
      incidentId,
      ...dto,
    });
  }

  @Get('incidents/open')
  async getOpenIncidents(
    @Query('workspaceId') workspaceId?: string,
    @Query('service') service?: string,
  ): Promise<HealthIncidentResponseDto[]> {
    return this.analyticsHealthService.getOpenIncidents(
      workspaceId,
      service as any,
    );
  }

  @Get('history')
  async getHealthHistory(@Query() dto: GetHealthHistoryDto): Promise<HealthCheckResponseDto[]> {
    return this.analyticsHealthService.getHealthHistory(dto);
  }

  @Get('operations/:workspaceId/:operationType')
  async getOperationStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('operationType') operationType: string,
  ): Promise<OperationStatusResponseDto> {
    return this.analyticsHealthService.getOperationStatus(workspaceId, operationType);
  }
}
