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
import { AiAgentService } from './ai-agent.service';
import {
  CreateAiAgentDto,
  UpdateAiAgentDto,
  AiAgentFilterDto,
  ExecuteAgentDto,
  CreateAgentConfigurationDto,
  UpdateAgentConfigurationDto,
  ExecutionFilterDto,
} from './dto';

@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly service: AiAgentService) {}

  @Post('agents')
  @HttpCode(HttpStatus.CREATED)
  async createAgent(@Body() dto: CreateAiAgentDto) {
    return this.service.createAgent(dto);
  }

  @Get('agents')
  async findAllAgents(@Query() filter: AiAgentFilterDto) {
    return this.service.findAllAgents(filter);
  }

  @Get('agents/:id')
  async findAgentById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.findAgentById(id, workspaceId);
  }

  @Patch('agents/:id')
  @HttpCode(HttpStatus.OK)
  async updateAgent(
    @Param('id') id: string,
    @Body() dto: UpdateAiAgentDto,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.updateAgent(id, dto, workspaceId);
  }

  @Delete('agents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAgent(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    await this.service.deleteAgent(id, workspaceId);
  }

  @Patch('agents/:id/activate')
  @HttpCode(HttpStatus.OK)
  async activateAgent(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.activateAgent(id, workspaceId);
  }

  @Patch('agents/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivateAgent(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.deactivateAgent(id, workspaceId);
  }

  @Patch('agents/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveAgent(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.archiveAgent(id, workspaceId);
  }

  @Post('configurations')
  @HttpCode(HttpStatus.CREATED)
  async createConfiguration(@Body() dto: CreateAgentConfigurationDto) {
    return this.service.createConfiguration(dto);
  }

  @Patch('configurations/:id')
  @HttpCode(HttpStatus.OK)
  async updateConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAgentConfigurationDto,
  ) {
    return this.service.updateConfiguration(id, workspaceId, dto);
  }

  @Delete('configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteConfiguration(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeAgent(@Body() dto: ExecuteAgentDto) {
    return this.service.executeAgent(dto);
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

  @Get('stats')
  async getAgentStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getAgentStats(workspaceId, start, end);
  }
}
