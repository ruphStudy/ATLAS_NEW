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
import { BusinessInsightsService } from './business-insights.service';
import {
  GenerateInsightDto,
  BulkGenerateInsightsDto,
  ReviewInsightDto,
  AcceptInsightDto,
  DismissInsightDto,
  ResolveInsightDto,
  RecordOutcomeDto,
  ChangePriorityDto,
  InsightFilterDto,
  HistoryFilterDto,
  InsightResponseDto,
  InsightHistoryResponseDto,
  InsightOutcomeResponseDto,
  PaginatedInsightResponseDto,
  PaginatedHistoryResponseDto,
} from './dto';

@Controller('business-insights')
export class BusinessInsightsController {
  constructor(private readonly businessInsightsService: BusinessInsightsService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateInsight(@Body() dto: GenerateInsightDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.generateInsight(dto);
  }

  @Post('generate/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkGenerate(@Body() dto: BulkGenerateInsightsDto): Promise<InsightResponseDto[]> {
    return this.businessInsightsService.bulkGenerate(dto);
  }

  @Put('review')
  async reviewInsight(@Body() dto: ReviewInsightDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.reviewInsight(dto);
  }

  @Put('accept')
  async acceptInsight(@Body() dto: AcceptInsightDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.acceptInsight(dto);
  }

  @Put('dismiss')
  async dismissInsight(@Body() dto: DismissInsightDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.dismissInsight(dto);
  }

  @Put('resolve')
  async resolveInsight(@Body() dto: ResolveInsightDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.resolveInsight(dto);
  }

  @Post('outcome')
  @HttpCode(HttpStatus.CREATED)
  async recordOutcome(@Body() dto: RecordOutcomeDto): Promise<InsightOutcomeResponseDto> {
    return this.businessInsightsService.recordOutcome(dto);
  }

  @Put('priority')
  async changePriority(@Body() dto: ChangePriorityDto): Promise<InsightResponseDto> {
    return this.businessInsightsService.changePriority(dto);
  }

  @Get(':id')
  async getInsightById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<InsightResponseDto> {
    return this.businessInsightsService.getInsightById(id, workspaceId);
  }

  @Get()
  async getAllInsights(@Query() filter: InsightFilterDto): Promise<PaginatedInsightResponseDto> {
    return this.businessInsightsService.getAllInsights(filter);
  }

  @Get('history/all')
  async getHistory(@Query() filter: HistoryFilterDto): Promise<PaginatedHistoryResponseDto> {
    return this.businessInsightsService.getHistory(filter);
  }

  @Get(':insightId/outcomes')
  async getOutcomes(
    @Param('insightId') insightId: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<InsightOutcomeResponseDto[]> {
    return this.businessInsightsService.getOutcomes(insightId, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInsight(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.businessInsightsService.deleteInsight(id, workspaceId);
  }

  @Delete('cache/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidated: number }> {
    const invalidated = await this.businessInsightsService.invalidateCache(workspaceId, pattern);
    return { invalidated };
  }

  @Post('expire-stale')
  @HttpCode(HttpStatus.OK)
  async expireStaleInsights(@Query('workspaceId') workspaceId: string): Promise<{ expired: number }> {
    const expired = await this.businessInsightsService.expireStaleInsights(workspaceId);
    return { expired };
  }
}
