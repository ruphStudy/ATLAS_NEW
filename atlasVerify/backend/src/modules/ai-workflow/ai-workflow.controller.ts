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
import { AiWorkflowService } from './ai-workflow.service';
import {
  CreateAiWorkflowDto,
  UpdateAiWorkflowDto,
  AiWorkflowFilterDto,
  ExecuteWorkflowDto,
  ExecutionFilterDto,
  CreateWorkflowScheduleDto,
  UpdateWorkflowScheduleDto,
} from './dto';

@Controller('ai-workflow')
export class AiWorkflowController {
  constructor(private readonly service: AiWorkflowService) {}

  @Post('workflows')
  @HttpCode(HttpStatus.CREATED)
  async createWorkflow(@Body() dto: CreateAiWorkflowDto) {
    return this.service.createWorkflow(dto);
  }

  @Get('workflows')
  async findAllWorkflows(@Query() filter: AiWorkflowFilterDto) {
    return this.service.findAllWorkflows(filter);
  }

  @Get('workflows/:id')
  async findWorkflowById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findWorkflowById(id, workspaceId);
  }

  @Patch('workflows/:id')
  @HttpCode(HttpStatus.OK)
  async updateWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAiWorkflowDto,
  ) {
    return this.service.updateWorkflow(id, workspaceId, dto);
  }

  @Delete('workflows/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteWorkflow(id, workspaceId);
  }

  @Post('workflows/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('publishedBy') publishedBy?: string,
  ) {
    return this.service.publishWorkflow(id, workspaceId, publishedBy);
  }

  @Patch('workflows/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.pauseWorkflow(id, workspaceId);
  }

  @Patch('workflows/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.resumeWorkflow(id, workspaceId);
  }

  @Patch('workflows/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveWorkflow(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.archiveWorkflow(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeWorkflow(@Body() dto: ExecuteWorkflowDto) {
    return this.service.executeWorkflow(dto);
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

  @Post('executions/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.pauseExecution(id, workspaceId);
  }

  @Post('executions/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.resumeExecution(id, workspaceId);
  }

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() dto: CreateWorkflowScheduleDto) {
    return this.service.createSchedule(dto);
  }

  @Patch('schedules/:id')
  @HttpCode(HttpStatus.OK)
  async updateSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkflowScheduleDto,
  ) {
    return this.service.updateSchedule(id, workspaceId, dto);
  }

  @Delete('schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteSchedule(id, workspaceId);
  }

  @Get('stats')
  async getWorkflowStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getWorkflowStats(workspaceId, start, end);
  }
}
