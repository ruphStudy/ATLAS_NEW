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
import { ReportBuilderService } from './report-builder.service';
import {
  CreateReportDefinitionDto,
  UpdateReportDefinitionDto,
  ExecuteReportDto,
  CreateReportTemplateDto,
  UpdateReportTemplateDto,
  ReportFilterDto2,
  ReportDefinitionResponseDto,
  ReportExecutionResponseDto,
  ReportResultResponseDto,
  ReportVersionResponseDto,
  ReportTemplateResponseDto,
} from './dto';

@Controller('report-builder')
export class ReportBuilderController {
  constructor(private readonly reportBuilderService: ReportBuilderService) {}

  @Post('definitions')
  async createDefinition(
    @Body() dto: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.createDefinition(dto);
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateReportDefinitionDto,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.updateDefinition(id, workspaceId, dto);
  }

  @Get('definitions/:id')
  async getDefinitionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.getDefinitionById(id, workspaceId);
  }

  @Get('definitions')
  async getAllDefinitions(@Query() filter: ReportFilterDto2): Promise<{
    definitions: ReportDefinitionResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.reportBuilderService.getAllDefinitions(filter);
  }

  @Post('definitions/:id/clone')
  @HttpCode(HttpStatus.OK)
  async cloneDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body('createdBy') createdBy: string,
    @Body('newName') newName?: string,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.cloneDefinition(id, workspaceId, createdBy, newName);
  }

  @Post('definitions/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.publishDefinition(id, workspaceId);
  }

  @Post('definitions/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.archiveDefinition(id, workspaceId);
  }

  @Post('definitions/:id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportDefinitionResponseDto> {
    return this.reportBuilderService.restoreDefinition(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeReport(
    @Body() dto: ExecuteReportDto,
  ): Promise<ReportResultResponseDto> {
    return this.reportBuilderService.executeReport(dto);
  }

  @Get('definitions/:id/versions')
  async getVersions(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportVersionResponseDto[]> {
    return this.reportBuilderService.getVersions(id, workspaceId);
  }

  @Get('definitions/:id/executions')
  async getExecutionHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ): Promise<ReportExecutionResponseDto[]> {
    return this.reportBuilderService.getExecutionHistory(id, workspaceId, limit);
  }

  @Post('templates')
  async createTemplate(
    @Body() dto: CreateReportTemplateDto,
  ): Promise<ReportTemplateResponseDto> {
    return this.reportBuilderService.createTemplate(dto);
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateReportTemplateDto,
  ): Promise<ReportTemplateResponseDto> {
    return this.reportBuilderService.updateTemplate(id, workspaceId, dto);
  }

  @Get('templates/:id')
  async getTemplateById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportTemplateResponseDto> {
    return this.reportBuilderService.getTemplateById(id, workspaceId);
  }

  @Get('templates')
  async getAllTemplates(
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ReportTemplateResponseDto[]> {
    return this.reportBuilderService.getAllTemplates(workspaceId);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.reportBuilderService.deleteTemplate(id, workspaceId);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidated: number }> {
    const count = await this.reportBuilderService.invalidateCache(workspaceId, pattern);
    return { invalidated: count };
  }
}
