import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiCostTrackingService } from './ai-cost-tracking.service';
import {
  RecordAiCostDto,
  EstimateAiCostDto,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  PricingConfigFilterDto,
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetFilterDto,
  CostRecordFilterDto,
  CostSummaryFilterDto,
  PricingConfigResponseDto,
  PaginatedPricingConfigResponseDto,
  PricingConfigHistoryResponseDto,
  CostRecordResponseDto,
  PaginatedCostRecordResponseDto,
  EstimateCostResponseDto,
  BudgetResponseDto,
  PaginatedBudgetResponseDto,
  BudgetAlertResponseDto,
  CostSummaryResponseDto,
} from './dto';

@Controller('ai-cost-tracking')
export class AiCostTrackingController {
  constructor(private readonly costTrackingService: AiCostTrackingService) {}

  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  async estimateCost(
    @Body() dto: EstimateAiCostDto,
  ): Promise<EstimateCostResponseDto> {
    return this.costTrackingService.estimateCost(dto);
  }

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  async recordCost(
    @Body() dto: RecordAiCostDto,
  ): Promise<CostRecordResponseDto> {
    return (await this.costTrackingService.recordCost(
      dto,
    )) as unknown as CostRecordResponseDto;
  }

  @Get('records')
  async findAllCostRecords(
    @Query() filter: CostRecordFilterDto,
  ): Promise<PaginatedCostRecordResponseDto> {
    return this.costTrackingService.findAllCostRecords(filter);
  }

  @Get('records/:id')
  async findCostRecordById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<CostRecordResponseDto> {
    return (await this.costTrackingService.findCostRecordById(
      id,
      workspaceId,
    )) as unknown as CostRecordResponseDto;
  }

  @Get('summary')
  async getCostSummary(
    @Query() filter: CostSummaryFilterDto,
  ): Promise<CostSummaryResponseDto> {
    return this.costTrackingService.getCostSummary(filter);
  }

  @Post('pricing-configs')
  @HttpCode(HttpStatus.CREATED)
  async createPricingConfig(
    @Body() dto: CreatePricingConfigDto,
  ): Promise<PricingConfigResponseDto> {
    return (await this.costTrackingService.createPricingConfig(
      dto,
    )) as unknown as PricingConfigResponseDto;
  }

  @Get('pricing-configs')
  async findAllPricingConfigs(
    @Query() filter: PricingConfigFilterDto,
  ): Promise<PaginatedPricingConfigResponseDto> {
    return this.costTrackingService.findAllPricingConfigs(filter);
  }

  @Get('pricing-configs/:id')
  async findPricingConfigById(
    @Param('id') id: string,
  ): Promise<PricingConfigResponseDto> {
    return (await this.costTrackingService.findPricingConfigById(
      id,
    )) as unknown as PricingConfigResponseDto;
  }

  @Patch('pricing-configs/:id')
  async updatePricingConfig(
    @Param('id') id: string,
    @Body() dto: UpdatePricingConfigDto,
  ): Promise<PricingConfigResponseDto> {
    return (await this.costTrackingService.updatePricingConfig(
      id,
      dto,
    )) as unknown as PricingConfigResponseDto;
  }

  @Delete('pricing-configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePricingConfig(@Param('id') id: string): Promise<void> {
    await this.costTrackingService.deletePricingConfig(id);
  }

  @Get('pricing-configs/:id/versions')
  async findPricingConfigVersions(
    @Param('id') id: string,
  ): Promise<PricingConfigHistoryResponseDto[]> {
    return (await this.costTrackingService.findPricingConfigVersions(
      id,
    )) as unknown as PricingConfigHistoryResponseDto[];
  }

  @Post('budgets')
  @HttpCode(HttpStatus.CREATED)
  async createBudget(
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return (await this.costTrackingService.createBudget(
      dto,
    )) as unknown as BudgetResponseDto;
  }

  @Get('budgets')
  async findAllBudgets(
    @Query() filter: BudgetFilterDto,
  ): Promise<PaginatedBudgetResponseDto> {
    return this.costTrackingService.findAllBudgets(filter);
  }

  @Get('budgets/:id')
  async findBudgetById(
    @Param('id') id: string,
  ): Promise<BudgetResponseDto> {
    return (await this.costTrackingService.findBudgetById(
      id,
    )) as unknown as BudgetResponseDto;
  }

  @Patch('budgets/:id')
  async updateBudget(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return (await this.costTrackingService.updateBudget(
      id,
      dto,
    )) as unknown as BudgetResponseDto;
  }

  @Delete('budgets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBudget(@Param('id') id: string): Promise<void> {
    await this.costTrackingService.deleteBudget(id);
  }

  @Get('budgets/:id/alerts')
  async getBudgetAlerts(
    @Param('id') id: string,
  ): Promise<BudgetAlertResponseDto[]> {
    return (await this.costTrackingService.getBudgetAlerts(
      id,
    )) as unknown as BudgetAlertResponseDto[];
  }
}
