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
import { ExportFrameworkService } from './export-framework.service';
import {
  CreateExportRequestDto,
  CreateBulkExportDto,
  ExportFilterDto,
  ExecutionFilterDto,
  ExportRequestResponseDto,
  ExportExecutionResponseDto,
  BulkExportResponseDto,
  ExportResultResponseDto,
  PaginatedExportRequestResponseDto,
  PaginatedExportExecutionResponseDto,
} from './dto';

@Controller('exports')
export class ExportFrameworkController {
  constructor(private readonly exportFrameworkService: ExportFrameworkService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createExport(
    @Body() dto: CreateExportRequestDto,
  ): Promise<ExportResultResponseDto> {
    return this.exportFrameworkService.createExport(dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async createBulkExport(
    @Body() dto: CreateBulkExportDto,
  ): Promise<BulkExportResponseDto> {
    return this.exportFrameworkService.createBulkExport(dto);
  }

  @Get('requests/:id')
  async getExportRequest(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ExportRequestResponseDto> {
    return this.exportFrameworkService.getExportRequest(id, workspaceId);
  }

  @Get('requests')
  async getAllExportRequests(
    @Query() filter: ExportFilterDto,
  ): Promise<PaginatedExportRequestResponseDto> {
    return this.exportFrameworkService.getAllExportRequests(filter);
  }

  @Get('executions/:id')
  async getExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ExportExecutionResponseDto> {
    return this.exportFrameworkService.getExecution(id, workspaceId);
  }

  @Get('executions')
  async getAllExecutions(
    @Query() filter: ExecutionFilterDto,
  ): Promise<PaginatedExportExecutionResponseDto> {
    return this.exportFrameworkService.getAllExecutions(filter);
  }

  @Get('executions/:id/download')
  async getDownloadUrl(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<{ downloadUrl: string }> {
    const url = await this.exportFrameworkService.getDownloadUrl(id, workspaceId);
    return { downloadUrl: url };
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelExport(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ExportRequestResponseDto> {
    return this.exportFrameworkService.cancelExport(id, workspaceId);
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredExports(): Promise<{ message: string }> {
    await this.exportFrameworkService.cleanupExpiredExports();
    return { message: 'Cleanup completed' };
  }
}
