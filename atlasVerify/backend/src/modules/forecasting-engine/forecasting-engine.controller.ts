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
import { ForecastingEngineService } from './forecasting-engine.service';
import {
  CreateForecastDefinitionDto,
  UpdateForecastDefinitionDto,
  GenerateForecastDto,
  BacktestForecastDto,
  BulkGenerateForecastDto,
  DefinitionFilterDto,
  ExecutionFilterDto,
  ForecastDefinitionResponseDto,
  ForecastExecutionResponseDto,
  ForecastResultResponseDto,
  BacktestResultResponseDto,
  PaginatedDefinitionResponseDto,
  PaginatedExecutionResponseDto,
} from './dto';

@Controller('forecasting')
export class ForecastingEngineController {
  constructor(private readonly forecastingService: ForecastingEngineService) {}

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @Body() dto: CreateForecastDefinitionDto,
  ): Promise<ForecastDefinitionResponseDto> {
    return this.forecastingService.createDefinition(dto);
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateForecastDefinitionDto,
  ): Promise<ForecastDefinitionResponseDto> {
    return this.forecastingService.updateDefinition(id, workspaceId, dto);
  }

  @Get('definitions/:id')
  async getDefinitionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ForecastDefinitionResponseDto> {
    return this.forecastingService.getDefinitionById(id, workspaceId);
  }

  @Get('definitions')
  async getAllDefinitions(@Query() filter: DefinitionFilterDto): Promise<PaginatedDefinitionResponseDto> {
    return this.forecastingService.getAllDefinitions(filter);
  }

  @Put('definitions/:id/enable')
  async enableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ForecastDefinitionResponseDto> {
    return this.forecastingService.enableDefinition(id, workspaceId);
  }

  @Put('definitions/:id/disable')
  async disableDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ForecastDefinitionResponseDto> {
    return this.forecastingService.disableDefinition(id, workspaceId);
  }

  @Delete('definitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDefinition(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.forecastingService.deleteDefinition(id, workspaceId);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateForecast(@Body() dto: GenerateForecastDto): Promise<ForecastExecutionResponseDto> {
    return this.forecastingService.generateForecast(dto);
  }

  @Post('generate/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkGenerate(@Body() dto: BulkGenerateForecastDto): Promise<ForecastExecutionResponseDto[]> {
    return this.forecastingService.bulkGenerate(dto);
  }

  @Post('backtest')
  @HttpCode(HttpStatus.CREATED)
  async backtest(@Body() dto: BacktestForecastDto): Promise<BacktestResultResponseDto> {
    return this.forecastingService.backtest(dto);
  }

  @Get('executions/:id')
  async getExecution(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ForecastExecutionResponseDto> {
    return this.forecastingService.getExecution(id, workspaceId);
  }

  @Get('executions')
  async getAllExecutions(@Query() filter: ExecutionFilterDto): Promise<PaginatedExecutionResponseDto> {
    return this.forecastingService.getAllExecutions(filter);
  }

  @Get('executions/:executionId/result')
  async getResult(
    @Param('executionId') executionId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ForecastResultResponseDto> {
    return this.forecastingService.getResult(executionId, workspaceId);
  }

  @Get('definitions/:definitionId/backtests')
  async getBacktestResults(
    @Param('definitionId') definitionId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<BacktestResultResponseDto[]> {
    return this.forecastingService.getBacktestResults(definitionId, workspaceId);
  }
}
