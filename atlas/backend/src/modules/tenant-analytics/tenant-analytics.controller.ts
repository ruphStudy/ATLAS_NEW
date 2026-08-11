import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { TenantAnalyticsService } from './tenant-analytics.service';
import { DateRangeDto, UsageBreakdownQueryDto, TenantSegmentFilterDto, CohortQueryDto, ExportAnalyticsQueryDto } from './dto';
import {
  TenantGrowthMetricsResponseDto,
  TenantRevenueMetricsResponseDto,
  TenantChurnMetricsResponseDto,
  TenantPaymentHealthResponseDto,
  TenantHealthSnapshotResponseDto,
  PaginatedTenantSegmentResponseDto,
  CohortRetentionResponseDto,
  PlanComparisonResponseDto,
} from './dto';

/** Every route here is gated by `PlatformAdminGuard` — strict platform-admin access per "Never expose cross-tenant sensitive data to tenant users." */
@UseGuards(PlatformAdminGuard)
@Controller({ path: 'tenant-analytics', version: '1' })
export class TenantAnalyticsController {
  constructor(private readonly tenantAnalyticsService: TenantAnalyticsService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @Get('process-health-sweep')
  async processHealthSweep(): Promise<{ computed: number }> {
    return this.tenantAnalyticsService.processHealthScoreSweep();
  }

  // ── Growth / revenue / churn / payment health ─────────────────────

  @Get('growth')
  async getGrowthMetrics(@Query() dto: DateRangeDto): Promise<TenantGrowthMetricsResponseDto> {
    return this.tenantAnalyticsService.getGrowthMetrics(dto);
  }

  @Get('revenue')
  async getRevenueMetrics(@Query() dto: DateRangeDto): Promise<TenantRevenueMetricsResponseDto> {
    return this.tenantAnalyticsService.getRevenueMetrics(dto);
  }

  @Get('churn')
  async getChurnAndExpansion(@Query() dto: DateRangeDto): Promise<TenantChurnMetricsResponseDto> {
    return this.tenantAnalyticsService.getChurnAndExpansion(dto);
  }

  @Get('payment-health')
  async getPaymentHealth(@Query() dto: DateRangeDto): Promise<TenantPaymentHealthResponseDto> {
    return this.tenantAnalyticsService.getPaymentHealth(dto);
  }

  // ── Usage / quota / license adoption ───────────────────────────────

  @Get('usage')
  async getUsageBreakdown(@Query() dto: UsageBreakdownQueryDto) {
    return this.tenantAnalyticsService.getUsageBreakdown(dto);
  }

  @Get('quota-license-adoption')
  async getQuotaAndLicenseAdoption() {
    return this.tenantAnalyticsService.getQuotaAndLicenseAdoption();
  }

  // ── Segmentation + health score ────────────────────────────────────

  @Get('segments')
  async getTenantSegments(@Query() filter: TenantSegmentFilterDto): Promise<PaginatedTenantSegmentResponseDto> {
    return this.tenantAnalyticsService.getTenantSegments(filter);
  }

  @Get('tenants/:workspaceId/health-score')
  async getTenantHealthScore(@Param('workspaceId') workspaceId: string): Promise<TenantHealthSnapshotResponseDto> {
    return (await this.tenantAnalyticsService.getTenantHealthScore(workspaceId)) as unknown as TenantHealthSnapshotResponseDto;
  }

  // ── Cohort / retention / plan comparison ──────────────────────────

  @Get('cohort-retention')
  async getCohortRetention(@Query() dto: CohortQueryDto): Promise<CohortRetentionResponseDto> {
    return this.tenantAnalyticsService.getCohortRetention(dto);
  }

  @Get('plan-comparison')
  async comparePlans(): Promise<PlanComparisonResponseDto[]> {
    return this.tenantAnalyticsService.comparePlans();
  }

  // ── Export ───────────────────────────────────────────────────────

  @Get('export')
  async exportReport(@Query() dto: ExportAnalyticsQueryDto, @Res() res: Response): Promise<void> {
    const { contentType, body } = await this.tenantAnalyticsService.exportReport(dto);
    res.setHeader('Content-Type', contentType);
    res.send(body);
  }
}
