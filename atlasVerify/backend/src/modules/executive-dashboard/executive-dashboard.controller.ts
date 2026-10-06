import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExecutiveDashboardService } from './executive-dashboard.service';
import {
  GetExecutiveOverviewDto,
  ExecutiveOverviewResponseDto,
  ExecutiveKpiResponseDto,
  ExecutiveAlertResponseDto,
  ExecutiveSummaryResponseDto,
} from './dto';
import { ExecutiveMetricCategory } from './interfaces';

@Controller('executive-dashboard')
export class ExecutiveDashboardController {
  constructor(
    private readonly executiveDashboardService: ExecutiveDashboardService,
  ) {}

  @Post('overview')
  @HttpCode(HttpStatus.OK)
  async getExecutiveOverview(
    @Body() dto: GetExecutiveOverviewDto,
  ): Promise<ExecutiveOverviewResponseDto> {
    return this.executiveDashboardService.getExecutiveOverview(dto);
  }

  @Get('kpis')
  async getKpisByCategory(
    @Query('workspaceId') workspaceId: string,
    @Query('category') category: ExecutiveMetricCategory,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ExecutiveKpiResponseDto[]> {
    return this.executiveDashboardService.getKpisByCategory(
      workspaceId,
      category,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('alerts')
  async getAlerts(
    @Query('workspaceId') workspaceId: string,
    @Query('resolved') resolved?: boolean,
  ): Promise<ExecutiveAlertResponseDto[]> {
    return this.executiveDashboardService.getAlerts(workspaceId, resolved);
  }

  @Get('summary')
  async getSummaryByCategory(
    @Query('workspaceId') workspaceId: string,
    @Query('category') category: ExecutiveMetricCategory,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ExecutiveSummaryResponseDto | null> {
    return this.executiveDashboardService.getSummaryByCategory(
      workspaceId,
      category,
      new Date(startDate),
      new Date(endDate),
    );
  }
}
