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
import { ScheduledReportsService } from './scheduled-reports.service';
import {
  CreateReportScheduleDto,
  UpdateReportScheduleDto,
  ExecuteScheduleDto,
  ScheduleFilterDto,
  ExecutionFilterDto,
  ReportScheduleResponseDto,
  ScheduleExecutionResponseDto,
  PaginatedScheduleResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';

@Controller('scheduled-reports')
export class ScheduledReportsController {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Post()
  async createSchedule(
    @Body() dto: CreateReportScheduleDto,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.createSchedule(dto);
  }

  @Put(':id')
  async updateSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateReportScheduleDto,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.updateSchedule(id, workspaceId, dto);
  }

  @Get(':id')
  async getScheduleById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.getScheduleById(id, workspaceId);
  }

  @Get()
  async getAllSchedules(
    @Query() filter: ScheduleFilterDto,
  ): Promise<PaginatedScheduleResponseDto> {
    return this.scheduledReportsService.getAllSchedules(filter);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enableSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.enableSchedule(id, workspaceId);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disableSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.disableSchedule(id, workspaceId);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.pauseSchedule(id, workspaceId);
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ReportScheduleResponseDto> {
    return this.scheduledReportsService.resumeSchedule(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.scheduledReportsService.deleteSchedule(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeSchedule(
    @Body() dto: ExecuteScheduleDto,
  ): Promise<ScheduleExecutionResponseDto> {
    return this.scheduledReportsService.executeSchedule(dto);
  }

  @Get(':id/executions')
  async getExecutionHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ): Promise<ScheduleExecutionResponseDto[]> {
    return this.scheduledReportsService.getExecutionHistory(id, workspaceId, limit);
  }

  @Get('executions/all')
  async getAllExecutions(
    @Query() filter: ExecutionFilterDto,
  ): Promise<PaginatedExecutionResponseDto> {
    return this.scheduledReportsService.getAllExecutions(filter);
  }

  @Post('missed-runs/detect')
  @HttpCode(HttpStatus.OK)
  async detectMissedRuns(): Promise<{ message: string }> {
    await this.scheduledReportsService.detectMissedRuns();
    return { message: 'Missed run detection completed' };
  }
}
