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
import { DataAggregationEngineService } from './data-aggregation-engine.service';
import {
  CreateAggregationDefinitionDto,
  UpdateAggregationDefinitionDto,
  ExecuteAggregationDto,
  BackfillAggregationDto,
  DefinitionFilterDto,
  ExecutionFilterDto,
  AggregationDefinitionResponseDto,
  AggregationExecutionResponseDto,
  AggregationSnapshotResponseDto,
  PaginatedDefinitionResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';

@Controller('data-aggregation')
export class DataAggregationEngineController {
  constructor(private readonly dataAggregationEngineService: DataAggregationEngineService) {}

  @Post('definitions')
  async createDefinition(
    @Body() dto: CreateAggregationDefinitionDto,
  ): Promise<AggregationDefinitionResponseDto> {
    return this.dataAggregationEngineService.createDefinition(dto);
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAggregationDefinitionDto,
  ): Promise<AggregationDefinitionResponseDto> {
    return this.dataAggregationEngineService.updateDefinition(id, workspaceId, dto);
  }

  @Get('definitions/:id')
  async getDefinitionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AggregationDefinitionResponseDto> {
    return this.dataAggregationEngineService.getDefinitionById(id, workspaceId);
  }

  @Get('definitions')
  async getAllDefinitions(
    @Query() filter: DefinitionFilterDto,
  ): Promise<PaginatedDefinitionResponseDto> {
    return this.dataAggregationEngineService.getAllDefinitions(filter);
  }

  @Post('definitions/:id/enable')
  @HttpCode(HttpStatus.OK)
  async enableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AggregationDefinitionResponseDto> {
    return this.dataAggregationEngineService.enableDefinition(id, workspaceId);
  }

  @Post('definitions/:id/disable')
  @HttpCode(HttpStatus.OK)
  async disableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AggregationDefinitionResponseDto> {
    return this.dataAggregationEngineService.disableDefinition(id, workspaceId);
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.dataAggregationEngineService.deleteDefinition(id, workspaceId);
  }

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeAggregation(
    @Body() dto: ExecuteAggregationDto,
  ): Promise<AggregationExecutionResponseDto> {
    return this.dataAggregationEngineService.executeAggregation(dto);
  }

  @Post('backfill')
  @HttpCode(HttpStatus.OK)
  async backfillAggregation(
    @Body() dto: BackfillAggregationDto,
  ): Promise<{ message: string }> {
    await this.dataAggregationEngineService.backfillAggregation(dto);
    return { message: 'Backfill started' };
  }

  @Get('executions/:id')
  async getExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AggregationExecutionResponseDto> {
    return this.dataAggregationEngineService.getExecution(id, workspaceId);
  }

  @Get('executions')
  async getAllExecutions(
    @Query() filter: ExecutionFilterDto,
  ): Promise<PaginatedExecutionResponseDto> {
    return this.dataAggregationEngineService.getAllExecutions(filter);
  }

  @Get('snapshots/:id')
  async getSnapshot(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<AggregationSnapshotResponseDto> {
    return this.dataAggregationEngineService.getSnapshot(id, workspaceId);
  }

  @Get('definitions/:id/snapshots')
  async getSnapshotsByDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
  ): Promise<AggregationSnapshotResponseDto[]> {
    return this.dataAggregationEngineService.getSnapshotsByDefinition(id, workspaceId, limit);
  }
}
