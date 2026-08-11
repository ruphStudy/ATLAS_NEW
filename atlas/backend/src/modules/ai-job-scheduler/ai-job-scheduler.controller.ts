import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiJobSchedulerService } from './ai-job-scheduler.service';
import {
  CreateAiJobDto,
  UpdateAiJobDto,
  AiJobFilterDto,
  ExecuteJobDto,
  ExecutionFilterDto,
  CreateJobDependencyDto,
} from './dto';

@Controller('ai-job-scheduler')
export class AiJobSchedulerController {
  constructor(private readonly service: AiJobSchedulerService) {}

  @Post('jobs')
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Body() dto: CreateAiJobDto) {
    return this.service.createJob(dto);
  }

  @Get('jobs')
  async findAllJobs(@Query() filter: AiJobFilterDto) {
    return this.service.findAllJobs(filter);
  }

  @Get('jobs/:id')
  async findJobById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findJobById(id, workspaceId);
  }

  @Patch('jobs/:id')
  @HttpCode(HttpStatus.OK)
  async updateJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAiJobDto,
  ) {
    return this.service.updateJob(id, workspaceId, dto);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteJob(id, workspaceId);
  }

  @Patch('jobs/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.pauseJob(id, workspaceId);
  }

  @Patch('jobs/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.resumeJob(id, workspaceId);
  }

  @Patch('jobs/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.archiveJob(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeJob(@Body() dto: ExecuteJobDto) {
    return this.service.executeJob(dto);
  }

  @Get('executions')
  async findAllExecutions(@Query() filter: ExecutionFilterDto) {
    return this.service.findAllExecutions(filter);
  }

  @Get('executions/:id')
  async findExecutionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findExecutionById(id, workspaceId);
  }

  @Post('executions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.cancelExecution(id, workspaceId);
  }

  @Post('dependencies')
  @HttpCode(HttpStatus.CREATED)
  async createDependency(@Body() dto: CreateJobDependencyDto) {
    return this.service.createDependency(dto);
  }

  @Get('stats')
  async getJobStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getJobStats(workspaceId, start, end);
  }
}
