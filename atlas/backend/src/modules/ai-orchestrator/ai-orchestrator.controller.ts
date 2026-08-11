import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import {
  CreateAiRequestDto,
  ExecuteAiRequestDto,
  AiRequestFilterDto,
  ExecutionLogFilterDto,
} from './dto';

@Controller('ai-orchestrator')
export class AiOrchestratorController {
  constructor(private readonly service: AiOrchestratorService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeRequest(@Body() dto: ExecuteAiRequestDto) {
    return this.service.executeRequest(dto);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() dto: CreateAiRequestDto) {
    return this.service.createRequest(dto);
  }

  @Get('requests')
  async findAllRequests(@Query() filter: AiRequestFilterDto) {
    return this.service.findAllRequests(filter);
  }

  @Get('requests/:id')
  async findRequestById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findRequestById(id, workspaceId);
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelRequest(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.cancelRequest(id, workspaceId);
  }

  @Delete('requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRequest(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteRequest(id, workspaceId);
  }

  @Get('execution-logs')
  async findExecutionLogs(@Query() filter: ExecutionLogFilterDto) {
    return this.service.findExecutionLogs(filter);
  }

  @Get('stats')
  async getRequestStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getRequestStats(workspaceId, start, end);
  }

  @Post('invalidate-cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ) {
    const count = await this.service.invalidateCache(workspaceId, pattern);
    return { invalidated: count };
  }
}
