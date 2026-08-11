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
import { AiUsageTrackingService } from './ai-usage-tracking.service';
import {
  RecordAiUsageDto,
  UsageRecordFilterDto,
  UsageSummaryFilterDto,
  UsageBreakdownFilterDto,
  CreateUsageQuotaDto,
  UpdateUsageQuotaDto,
  QuotaFilterDto,
  ReconciliationFilterDto,
  UsageRecordResponseDto,
  PaginatedUsageRecordResponseDto,
  UsageSummaryResponseDto,
  UsageBreakdownBucketResponseDto,
  UsageQuotaResponseDto,
  PaginatedUsageQuotaResponseDto,
  UsageQuotaAlertResponseDto,
  ReconciliationResultResponseDto,
} from './dto';

@Controller('ai-usage-tracking')
export class AiUsageTrackingController {
  constructor(private readonly usageTrackingService: AiUsageTrackingService) {}

  @Post('records')
  @HttpCode(HttpStatus.CREATED)
  async recordUsage(
    @Body() dto: RecordAiUsageDto,
  ): Promise<UsageRecordResponseDto> {
    return (await this.usageTrackingService.recordUsage(
      dto,
    )) as unknown as UsageRecordResponseDto;
  }

  @Get('records')
  async findAllUsageRecords(
    @Query() filter: UsageRecordFilterDto,
  ): Promise<PaginatedUsageRecordResponseDto> {
    return this.usageTrackingService.findAllUsageRecords(filter);
  }

  @Get('records/:id')
  async findUsageRecordById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<UsageRecordResponseDto> {
    return (await this.usageTrackingService.findUsageRecordById(
      id,
      workspaceId,
    )) as unknown as UsageRecordResponseDto;
  }

  @Get('summary')
  async getUsageSummary(
    @Query() filter: UsageSummaryFilterDto,
  ): Promise<UsageSummaryResponseDto> {
    return this.usageTrackingService.getUsageSummary(filter);
  }

  @Get('breakdown')
  async getUsageBreakdown(
    @Query() filter: UsageBreakdownFilterDto,
  ): Promise<UsageBreakdownBucketResponseDto[]> {
    return this.usageTrackingService.getUsageBreakdown(filter);
  }

  @Get('reconcile')
  async reconcile(
    @Query() filter: ReconciliationFilterDto,
  ): Promise<ReconciliationResultResponseDto> {
    return this.usageTrackingService.reconcile(filter);
  }

  @Post('quotas')
  @HttpCode(HttpStatus.CREATED)
  async createQuota(
    @Body() dto: CreateUsageQuotaDto,
  ): Promise<UsageQuotaResponseDto> {
    return (await this.usageTrackingService.createQuota(
      dto,
    )) as unknown as UsageQuotaResponseDto;
  }

  @Get('quotas')
  async findAllQuotas(
    @Query() filter: QuotaFilterDto,
  ): Promise<PaginatedUsageQuotaResponseDto> {
    return this.usageTrackingService.findAllQuotas(filter);
  }

  @Get('quotas/:id')
  async findQuotaById(
    @Param('id') id: string,
  ): Promise<UsageQuotaResponseDto> {
    return (await this.usageTrackingService.findQuotaById(
      id,
    )) as unknown as UsageQuotaResponseDto;
  }

  @Patch('quotas/:id')
  async updateQuota(
    @Param('id') id: string,
    @Body() dto: UpdateUsageQuotaDto,
  ): Promise<UsageQuotaResponseDto> {
    return (await this.usageTrackingService.updateQuota(
      id,
      dto,
    )) as unknown as UsageQuotaResponseDto;
  }

  @Delete('quotas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuota(@Param('id') id: string): Promise<void> {
    await this.usageTrackingService.deleteQuota(id);
  }

  @Get('quotas/:id/alerts')
  async getQuotaAlerts(
    @Param('id') id: string,
  ): Promise<UsageQuotaAlertResponseDto[]> {
    return (await this.usageTrackingService.getQuotaAlerts(
      id,
    )) as unknown as UsageQuotaAlertResponseDto[];
  }
}
