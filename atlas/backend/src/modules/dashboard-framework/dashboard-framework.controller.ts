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
import { DashboardFrameworkService } from './dashboard-framework.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CloneDashboardDto,
  DashboardResponseDto,
  AddWidgetDto,
  UpdateWidgetDto,
  DashboardWidgetResponseDto,
  CreateDashboardTemplateDto,
  UpdateDashboardTemplateDto,
  DashboardTemplateResponseDto,
  ExportDashboardDto,
  DashboardExportResponseDto,
  DashboardVersionResponseDto,
} from './dto';

@Controller('dashboard-framework')
export class DashboardFrameworkController {
  constructor(
    private readonly dashboardService: DashboardFrameworkService,
  ) {}

  @Post('dashboards')
  @HttpCode(HttpStatus.CREATED)
  async createDashboard(
    @Body() dto: CreateDashboardDto,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.createDashboard(dto);
  }

  @Get('dashboards/:id')
  async getDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getDashboard(id, workspaceId);
  }

  @Get('dashboards')
  async listDashboards(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status?: string,
    @Query('isTemplate') isTemplate?: boolean,
  ): Promise<DashboardResponseDto[]> {
    return this.dashboardService.listDashboards(workspaceId, {
      status,
      isTemplate,
    });
  }

  @Put('dashboards/:id')
  async updateDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('updatedBy') updatedBy: string,
    @Body() dto: UpdateDashboardDto,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.updateDashboard(id, workspaceId, dto, updatedBy);
  }

  @Post('dashboards/:id/clone')
  @HttpCode(HttpStatus.CREATED)
  async cloneDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CloneDashboardDto,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.cloneDashboard(id, workspaceId, dto);
  }

  @Post('dashboards/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('publishedBy') publishedBy: string,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.publishDashboard(id, workspaceId, publishedBy);
  }

  @Post('dashboards/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.archiveDashboard(id, workspaceId);
  }

  @Post('dashboards/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.restoreDashboard(id, workspaceId);
  }

  @Delete('dashboards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDashboard(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.dashboardService.deleteDashboard(id, workspaceId);
  }

  @Post('widgets')
  @HttpCode(HttpStatus.CREATED)
  async addWidget(@Body() dto: AddWidgetDto): Promise<DashboardWidgetResponseDto> {
    return this.dashboardService.addWidget(dto);
  }

  @Get('widgets/:id')
  async getWidget(@Param('id') id: string): Promise<DashboardWidgetResponseDto> {
    return this.dashboardService.getWidget(id);
  }

  @Get('dashboards/:dashboardId/widgets')
  async listWidgets(
    @Param('dashboardId') dashboardId: string,
  ): Promise<DashboardWidgetResponseDto[]> {
    return this.dashboardService.listWidgets(dashboardId);
  }

  @Put('widgets/:id')
  async updateWidget(
    @Param('id') id: string,
    @Body() dto: UpdateWidgetDto,
  ): Promise<DashboardWidgetResponseDto> {
    return this.dashboardService.updateWidget(id, dto);
  }

  @Delete('widgets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWidget(@Param('id') id: string): Promise<void> {
    return this.dashboardService.deleteWidget(id);
  }

  @Get('dashboards/:dashboardId/versions')
  async getDashboardVersions(
    @Param('dashboardId') dashboardId: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ): Promise<DashboardVersionResponseDto[]> {
    return this.dashboardService.getDashboardVersions(
      dashboardId,
      workspaceId,
      limit,
    );
  }

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body() dto: CreateDashboardTemplateDto,
  ): Promise<DashboardTemplateResponseDto> {
    return this.dashboardService.createTemplate(dto);
  }

  @Get('templates/:id')
  async getTemplate(
    @Param('id') id: string,
  ): Promise<DashboardTemplateResponseDto> {
    return this.dashboardService.getTemplate(id);
  }

  @Get('templates')
  async listTemplates(
    @Query('workspaceId') workspaceId?: string,
    @Query('category') category?: string,
    @Query('isGlobal') isGlobal?: boolean,
  ): Promise<DashboardTemplateResponseDto[]> {
    return this.dashboardService.listTemplates(workspaceId, {
      category,
      isGlobal,
    });
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateDashboardTemplateDto,
  ): Promise<DashboardTemplateResponseDto> {
    return this.dashboardService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string): Promise<void> {
    return this.dashboardService.deleteTemplate(id);
  }

  @Post('exports')
  @HttpCode(HttpStatus.CREATED)
  async exportDashboard(
    @Body() dto: ExportDashboardDto,
  ): Promise<DashboardExportResponseDto> {
    return this.dashboardService.exportDashboard(dto);
  }

  @Get('exports/:id')
  async getExport(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DashboardExportResponseDto> {
    return this.dashboardService.getExport(id, workspaceId);
  }

  @Get('dashboards/:dashboardId/exports')
  async listExports(
    @Param('dashboardId') dashboardId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DashboardExportResponseDto[]> {
    return this.dashboardService.listExports(dashboardId, workspaceId);
  }
}
