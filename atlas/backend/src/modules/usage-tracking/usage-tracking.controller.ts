import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { UsageTrackingService } from './usage-tracking.service';
import {
  RecordUsageDto,
  BatchRecordUsageDto,
  ReverseUsageDto,
  AdjustUsageDto,
  UsageFilterDto,
  UsageBreakdownFilterDto,
  UsageRecordResponseDto,
  PaginatedUsageRecordResponseDto,
  UsageCorrectionResponseDto,
  UsageBucketResponseDto,
  UsageEntitlementComparisonResponseDto,
  UsageSummaryResponseDto,
} from './dto';

@Controller({ path: 'usage-tracking', version: '1' })
@UseGuards(TenantIsolationGuard)
export class UsageTrackingController {
  constructor(private readonly usageTrackingService: UsageTrackingService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @Post('process-threshold-sweep')
  async processThresholdSweep(): Promise<{ checked: number }> {
    return this.usageTrackingService.processThresholdSweep();
  }

  // ── Summaries / entitlement comparison (checked before the generic :id route) ──

  @Get('summary')
  async getUsageSummary(@WorkspaceId() workspaceId: string, @Query('resourceKey') resourceKey?: string): Promise<UsageSummaryResponseDto[]> {
    return (await this.usageTrackingService.getUsageSummary(workspaceId, resourceKey)) as unknown as UsageSummaryResponseDto[];
  }

  @Get('entitlement/:resourceKey')
  async compareToEntitlement(@Param('resourceKey') resourceKey: string, @WorkspaceId() workspaceId: string): Promise<UsageEntitlementComparisonResponseDto> {
    return (await this.usageTrackingService.compareToEntitlement(workspaceId, resourceKey)) as unknown as UsageEntitlementComparisonResponseDto;
  }

  @Get('breakdown')
  async getUsageBreakdown(@WorkspaceId() workspaceId: string, @Query() filter: UsageBreakdownFilterDto): Promise<UsageBucketResponseDto[]> {
    return (await this.usageTrackingService.getUsageBreakdown(workspaceId, filter)) as unknown as UsageBucketResponseDto[];
  }

  // ── Records ──────────────────────────────────────────────────────

  @Post('records')
  async recordUsage(@WorkspaceId() workspaceId: string, @UserId() userId: string, @Body() dto: RecordUsageDto): Promise<UsageRecordResponseDto> {
    return (await this.usageTrackingService.recordUsage(workspaceId, userId, dto)) as unknown as UsageRecordResponseDto;
  }

  @Post('records/batch')
  async recordBatch(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BatchRecordUsageDto,
  ): Promise<{ recorded: number; skipped: number; errors: string[] }> {
    return this.usageTrackingService.recordBatch(workspaceId, userId, dto);
  }

  @Get('records')
  async findAllRecords(@WorkspaceId() workspaceId: string, @Query() filter: UsageFilterDto): Promise<PaginatedUsageRecordResponseDto> {
    return this.usageTrackingService.findAllRecords(workspaceId, filter);
  }

  @Get('records/:id')
  async getRecord(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<UsageRecordResponseDto> {
    return (await this.usageTrackingService.getRecord(id, workspaceId)) as unknown as UsageRecordResponseDto;
  }

  @Post('records/:id/reverse')
  async reverseUsage(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ReverseUsageDto,
  ): Promise<UsageCorrectionResponseDto> {
    return (await this.usageTrackingService.reverseUsage(id, workspaceId, userId, userRole, dto)) as unknown as UsageCorrectionResponseDto;
  }

  @Post('records/:id/adjust')
  async adjustUsage(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AdjustUsageDto,
  ): Promise<UsageCorrectionResponseDto> {
    return (await this.usageTrackingService.adjustUsage(id, workspaceId, userId, userRole, dto)) as unknown as UsageCorrectionResponseDto;
  }
}
