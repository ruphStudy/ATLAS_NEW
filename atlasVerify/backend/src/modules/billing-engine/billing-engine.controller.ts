import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { BillingEngineService } from './billing-engine.service';
import {
  GenerateBillingPeriodDto,
  AddAdjustmentDto,
  RecordPaymentDto,
  BillingReasonDto,
  RefundBillingPeriodDto,
  BillingFilterDto,
  CreateBillingRuleDto,
  UpdateBillingRuleDto,
  BillingPeriodResponseDto,
  PaginatedBillingPeriodResponseDto,
  BillingItemResponseDto,
  BillingHistoryResponseDto,
  BillingRuleResponseDto,
  ReconciliationReportResponseDto,
} from './dto';

@Controller({ path: 'billing-engine', version: '1' })
@UseGuards(TenantIsolationGuard)
export class BillingEngineController {
  constructor(private readonly billingEngineService: BillingEngineService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @Post('process-overdue')
  async processOverdue(): Promise<{ overdue: number }> {
    return this.billingEngineService.processOverdueSweep();
  }

  // ── Billing rules ────────────────────────────────────────────────

  @Post('rules')
  async createRule(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateBillingRuleDto,
  ): Promise<BillingRuleResponseDto> {
    return (await this.billingEngineService.createBillingRule(workspaceId, userId, userRole, dto)) as unknown as BillingRuleResponseDto;
  }

  @Get('rules')
  async listRules(@WorkspaceId() workspaceId: string): Promise<BillingRuleResponseDto[]> {
    return (await this.billingEngineService.listBillingRules(workspaceId)) as unknown as BillingRuleResponseDto[];
  }

  @Post('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateBillingRuleDto,
  ): Promise<BillingRuleResponseDto> {
    return (await this.billingEngineService.updateBillingRule(id, userId, userRole, dto)) as unknown as BillingRuleResponseDto;
  }

  // ── Billing periods ──────────────────────────────────────────────

  @Post('periods')
  async generate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: GenerateBillingPeriodDto,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.generateBillingPeriod(workspaceId, userId, userRole, dto)) as unknown as BillingPeriodResponseDto;
  }

  @Get('periods')
  async findAll(@WorkspaceId() workspaceId: string, @Query() filter: BillingFilterDto): Promise<PaginatedBillingPeriodResponseDto> {
    return this.billingEngineService.findAllBillingPeriods(workspaceId, filter);
  }

  @Get('periods/:id')
  async getOne(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.getBillingPeriod(id, workspaceId)) as unknown as BillingPeriodResponseDto;
  }

  @Get('periods/:id/items')
  async getItems(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<BillingItemResponseDto[]> {
    return (await this.billingEngineService.getItems(id, workspaceId)) as unknown as BillingItemResponseDto[];
  }

  @Get('periods/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<BillingHistoryResponseDto[]> {
    return (await this.billingEngineService.getHistory(id, workspaceId)) as unknown as BillingHistoryResponseDto[];
  }

  @Post('periods/:id/adjustments')
  async addAdjustment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AddAdjustmentDto,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.addAdjustment(id, workspaceId, userId, userRole, dto)) as unknown as BillingPeriodResponseDto;
  }

  @Post('periods/:id/bill')
  async markBilled(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.markBilled(id, workspaceId, userId, userRole)) as unknown as BillingPeriodResponseDto;
  }

  @Post('periods/:id/payments')
  async recordPayment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.recordPayment(id, workspaceId, userId, userRole, dto)) as unknown as BillingPeriodResponseDto;
  }

  @Post('periods/:id/void')
  async voidPeriod(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: BillingReasonDto,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.voidBillingPeriod(id, workspaceId, userId, userRole, dto)) as unknown as BillingPeriodResponseDto;
  }

  @Post('periods/:id/refund')
  async refundPeriod(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RefundBillingPeriodDto,
  ): Promise<BillingPeriodResponseDto> {
    return (await this.billingEngineService.refundBillingPeriod(id, workspaceId, userId, userRole, dto)) as unknown as BillingPeriodResponseDto;
  }

  @Post('periods/:id/reconcile')
  async reconcile(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ReconciliationReportResponseDto> {
    return (await this.billingEngineService.reconcileWithSubscription(id, workspaceId, userId)) as unknown as ReconciliationReportResponseDto;
  }
}
