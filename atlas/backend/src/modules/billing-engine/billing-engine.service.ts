import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { PlanManagementService } from '@modules/plan-management/plan-management.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { BillingEngineRepository } from './billing-engine.repository';
import { BillingEngineEventQueue } from './jobs';
import { calculateProration } from './proration.util';
import { buildBillingRuleScopeKey } from './scope-key.util';
import {
  GenerateBillingPeriodDto,
  AddAdjustmentDto,
  RecordPaymentDto,
  BillingReasonDto,
  RefundBillingPeriodDto,
  BillingFilterDto,
  CreateBillingRuleDto,
  UpdateBillingRuleDto,
  PaginatedBillingPeriodResponseDto,
} from './dto';
import {
  IBillingPeriod,
  IBillingItem,
  IBillingHistory,
  IBillingRule,
  IResolvedBillingRule,
  IReconciliationReport,
  BillingPeriodStatus,
  BillingCycle,
  BillingTriggerType,
  BillingItemType,
  BillingHistoryChangeType,
  BillingEngineEvent,
  BillingRuleScope,
  ProrationStrategy,
} from './interfaces';
import {
  BILLING_ALLOWED_TRANSITIONS,
  BILLING_ENGINE_MODULE,
  BILLING_MANAGE_ROLES,
  DEFAULT_RESOLVED_BILLING_RULE,
  OPEN_BILLING_STATUSES,
} from './constants';
import {
  BillingAccessDeniedException,
  BillingInvalidDefinitionException,
  BillingPaymentExceedsBalanceException,
  BillingPeriodImmutableException,
  BillingPeriodInvalidStateTransitionException,
  BillingPeriodNotFoundException,
  BillingRuleNotFoundException,
} from './exceptions/billing-engine.exceptions';

interface ITransitionOptions {
  changeType: BillingHistoryChangeType;
  event: BillingEngineEvent;
  reason?: string;
  extraFields?: Partial<IBillingPeriod>;
}

@Injectable()
export class BillingEngineService {
  private readonly logger = new Logger(BillingEngineService.name);

  constructor(
    private readonly repository: BillingEngineRepository,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly planManagementService: PlanManagementService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: BillingEngineEventQueue,
  ) {}

  // ── Generation ───────────────────────────────────────────────────

  async generateBillingPeriod(workspaceId: string, userId: string, userRole: string, dto: GenerateBillingPeriodDto): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);

    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    let organizationId = dto.organizationId ?? null;
    let planKey = dto.planKey ?? null;
    let billingCycle = dto.billingCycle ?? null;
    let currency = dto.currency ?? null;
    let periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    let periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    let baseAmount = dto.baseAmount ?? null;
    let baseDescription = dto.baseDescription ?? 'Subscription charge';

    if (dto.subscriptionId) {
      const subscription = await this.subscriptionManagementService.getSubscription(dto.subscriptionId, workspaceId);
      organizationId = organizationId ?? subscription.organizationId;
      planKey = planKey ?? subscription.planKey;
      billingCycle = billingCycle ?? (subscription.billingCycle as unknown as BillingCycle);
      periodStart = periodStart ?? subscription.currentPeriodStart;
      periodEnd = periodEnd ?? subscription.currentPeriodEnd;

      if (baseAmount === null) {
        const snapshot = await this.planManagementService.getEntitlementSnapshot(subscription.planKey);
        const matchedPrice = snapshot.prices.find(
          (p) => (currency ? p.currency === currency : true) && p.billingCycle === (billingCycle as unknown as string),
        );
        if (!matchedPrice) {
          throw new BillingInvalidDefinitionException(
            `No plan price found for '${subscription.planKey}' matching currency/cycle — pass baseAmount explicitly for a custom/negotiated price`,
          );
        }
        baseAmount = matchedPrice.amount;
        currency = currency ?? matchedPrice.currency;
        baseDescription = dto.baseDescription ?? `${snapshot.tier} plan (${snapshot.code})`;
      }
    }

    if (!billingCycle || !periodStart || !periodEnd || !currency || baseAmount === null) {
      throw new BillingInvalidDefinitionException(
        'billingCycle, periodStart, periodEnd, currency and baseAmount are required unless subscriptionId supplies them',
      );
    }
    if (periodEnd.getTime() <= periodStart.getTime()) {
      throw new BillingInvalidDefinitionException('periodEnd must be after periodStart');
    }

    const rule = await this.resolveBillingRule(workspaceId, organizationId, planKey, dto.country, dto.region);
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : periodEnd;

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : periodStart;
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : periodEnd;
    const isProrated = effectiveFrom.getTime() !== periodStart.getTime() || effectiveTo.getTime() !== periodEnd.getTime();

    const items: Partial<IBillingItem>[] = [];
    let subtotal = 0;

    if (isProrated) {
      const proratedAmount = calculateProration(periodStart, periodEnd, effectiveFrom, effectiveTo, baseAmount, rule.prorationStrategy);
      items.push({
        workspaceId,
        type: BillingItemType.PRORATION,
        description: `${baseDescription} (prorated)`,
        amount: proratedAmount,
        currency,
        planKey,
        calculationInput: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          effectiveFrom: effectiveFrom.toISOString(),
          effectiveTo: effectiveTo.toISOString(),
          fullPeriodAmount: baseAmount,
          strategy: rule.prorationStrategy,
        },
      });
      subtotal += proratedAmount;
    } else {
      items.push({ workspaceId, type: BillingItemType.SUBSCRIPTION_CHARGE, description: baseDescription, amount: baseAmount, currency, planKey });
      subtotal += baseAmount;
    }

    let discountTotal = 0;
    let creditTotal = 0;
    let adjustmentTotal = 0;

    for (const additional of dto.additionalItems ?? []) {
      items.push({
        workspaceId,
        type: additional.type,
        description: additional.description,
        amount: additional.amount,
        quantity: additional.quantity ?? null,
        unitAmount: additional.unitAmount ?? null,
        currency,
        resourceKey: additional.resourceKey ?? null,
        calculationInput: additional.calculationInput ?? null,
      });
      if (additional.type === BillingItemType.DISCOUNT) discountTotal += additional.amount;
      else if (additional.type === BillingItemType.CREDIT) creditTotal += additional.amount;
      else if (additional.type === BillingItemType.ADJUSTMENT) adjustmentTotal += additional.amount;
      else subtotal += additional.amount;
    }

    let overageTotal = 0;
    for (const usage of dto.usageOverages ?? []) {
      if (usage.usageAmount <= usage.limit) continue;
      const overageUnits = usage.usageAmount - usage.limit;
      const overageRate = rule.overageRates.find((r) => r.resourceKey === usage.resourceKey);
      if (!overageRate) continue;
      const amount = Math.round(overageUnits * overageRate.rate * 100) / 100;
      items.push({
        workspaceId,
        type: BillingItemType.OVERAGE,
        description: `${usage.resourceKey} overage (${overageUnits} ${overageRate.unit ?? 'units'})`,
        amount,
        currency,
        resourceKey: usage.resourceKey,
        calculationInput: { resourceKey: usage.resourceKey, usageAmount: usage.usageAmount, limit: usage.limit, rate: overageRate.rate },
      });
      overageTotal += amount;
    }

    const taxableBase = subtotal - discountTotal - creditTotal + overageTotal + adjustmentTotal;
    const taxTotal = rule.taxRatePercent > 0 ? Math.round(taxableBase * (rule.taxRatePercent / 100) * 100) / 100 : 0;
    if (taxTotal > 0) {
      items.push({
        workspaceId,
        type: BillingItemType.TAX,
        description: `Tax (${rule.taxRatePercent}%)`,
        amount: taxTotal,
        currency,
        calculationInput: { taxableBase, taxRatePercent: rule.taxRatePercent },
      });
    }

    const total = Math.round((taxableBase + taxTotal) * 100) / 100;

    const billingPeriod = await this.repository.create({
      workspaceId,
      organizationId,
      subscriptionId: dto.subscriptionId ?? null,
      scopeKey: `WORKSPACE:${workspaceId}`,
      triggerType: dto.triggerType ?? BillingTriggerType.RENEWAL,
      billingCycle,
      customCycleDays: dto.customCycleDays ?? null,
      periodStart,
      periodEnd,
      dueDate,
      currency,
      status: BillingPeriodStatus.DRAFT,
      subtotal,
      discountTotal,
      creditTotal,
      taxTotal,
      overageTotal,
      adjustmentTotal,
      total,
      amountPaid: 0,
      balanceDue: total,
      idempotencyKey: dto.idempotencyKey ?? null,
      version: 1,
      createdBy: userId,
    });

    await this.repository.createItems(items.map((item) => ({ ...item, billingPeriodId: billingPeriod.id })));

    await this.repository.createHistory({
      billingPeriodId: billingPeriod.id,
      workspaceId,
      changeType: BillingHistoryChangeType.GENERATED,
      toStatus: BillingPeriodStatus.DRAFT,
      changedBy: userId,
      snapshot: billingPeriod as any,
    });

    await this.recordAudit(workspaceId, userId, 'billing-engine.billing_period.generated', AuditActionCategory.CREATE, billingPeriod.id);
    await this.publishEvent(BillingEngineEvent.BILLING_PERIOD_GENERATED, billingPeriod, userId);
    return billingPeriod;
  }

  async addAdjustment(id: string, workspaceId: string, userId: string, userRole: string, dto: AddAdjustmentDto): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);

    if (!OPEN_BILLING_STATUSES.includes(billingPeriod.status)) {
      throw new BillingPeriodImmutableException(billingPeriod.status);
    }

    const type = dto.type ?? BillingItemType.ADJUSTMENT;
    await this.repository.createItem({
      billingPeriodId: id,
      workspaceId,
      type,
      description: dto.description,
      amount: dto.amount,
      currency: billingPeriod.currency,
      calculationInput: { manualReason: dto.reason },
    });

    const updated = await this.recalculateTotals(billingPeriod, type, dto.amount);

    await this.repository.createHistory({
      billingPeriodId: id,
      workspaceId,
      changeType: BillingHistoryChangeType.ADJUSTED,
      fromStatus: billingPeriod.status,
      toStatus: updated.status,
      reason: dto.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, 'billing-engine.billing_period.adjusted', AuditActionCategory.UPDATE, id);
    await this.publishEvent(BillingEngineEvent.BILLING_PERIOD_RECALCULATED, updated, userId, { reason: dto.reason });
    return updated;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async markBilled(id: string, workspaceId: string, userId: string, userRole: string): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);

    return this.transition(billingPeriod, BillingPeriodStatus.BILLED, userId, {
      changeType: BillingHistoryChangeType.BILLED,
      event: BillingEngineEvent.BILLING_PERIOD_BILLED,
      extraFields: { billedAt: new Date() },
    });
  }

  async recordPayment(id: string, workspaceId: string, userId: string, userRole: string, dto: RecordPaymentDto): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);

    if (![BillingPeriodStatus.BILLED, BillingPeriodStatus.PARTIALLY_PAID, BillingPeriodStatus.OVERDUE].includes(billingPeriod.status)) {
      throw new BillingPeriodInvalidStateTransitionException(billingPeriod.status, 'PAYMENT_RECORDED');
    }
    if (dto.amount > billingPeriod.balanceDue + 0.01) {
      throw new BillingPaymentExceedsBalanceException();
    }

    const amountPaid = Math.round((billingPeriod.amountPaid + dto.amount) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((billingPeriod.total - amountPaid) * 100) / 100);
    const toStatus = balanceDue <= 0.01 ? BillingPeriodStatus.PAID : BillingPeriodStatus.PARTIALLY_PAID;

    return this.transition(billingPeriod, toStatus, userId, {
      changeType: BillingHistoryChangeType.PAYMENT_RECORDED,
      event: BillingEngineEvent.PAYMENT_RECORDED,
      extraFields: {
        amountPaid,
        balanceDue,
        paidAt: toStatus === BillingPeriodStatus.PAID ? (dto.paidAt ? new Date(dto.paidAt) : new Date()) : billingPeriod.paidAt,
        externalReference: (dto.externalReference ?? billingPeriod.externalReference) as any,
      },
    });
  }

  async voidBillingPeriod(id: string, workspaceId: string, userId: string, userRole: string, dto: BillingReasonDto): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);

    return this.transition(billingPeriod, BillingPeriodStatus.VOID, userId, {
      changeType: BillingHistoryChangeType.VOIDED,
      event: BillingEngineEvent.BILLING_PERIOD_VOIDED,
      reason: dto.reason,
      extraFields: { voidedAt: new Date(), voidReason: dto.reason },
    });
  }

  async refundBillingPeriod(id: string, workspaceId: string, userId: string, userRole: string, dto: RefundBillingPeriodDto): Promise<IBillingPeriod> {
    this.assertCanManage(userRole);
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);

    const refundAmount = dto.amount ?? billingPeriod.amountPaid;
    if (refundAmount > billingPeriod.amountPaid + 0.01) {
      throw new BillingPaymentExceedsBalanceException();
    }

    const isFullRefund = refundAmount >= billingPeriod.amountPaid - 0.01;
    if (!isFullRefund) {
      await this.repository.createItem({
        billingPeriodId: id,
        workspaceId,
        type: BillingItemType.ADJUSTMENT,
        description: 'Partial refund',
        amount: -refundAmount,
        currency: billingPeriod.currency,
        calculationInput: { refundReason: dto.reason },
      });
      const updated = await this.recalculateTotals(billingPeriod, BillingItemType.ADJUSTMENT, -refundAmount);
      await this.repository.createHistory({
        billingPeriodId: id,
        workspaceId,
        changeType: BillingHistoryChangeType.REFUNDED,
        fromStatus: billingPeriod.status,
        toStatus: updated.status,
        reason: dto.reason,
        changedBy: userId,
        snapshot: updated as any,
      });
      await this.recordAudit(workspaceId, userId, 'billing-engine.billing_period.partial_refund', AuditActionCategory.UPDATE, id);
      await this.publishEvent(BillingEngineEvent.BILLING_PERIOD_REFUNDED, updated, userId, { amount: refundAmount, partial: true });
      return updated;
    }

    return this.transition(billingPeriod, BillingPeriodStatus.REFUNDED, userId, {
      changeType: BillingHistoryChangeType.REFUNDED,
      event: BillingEngineEvent.BILLING_PERIOD_REFUNDED,
      reason: dto.reason,
      extraFields: { refundedAt: new Date(), refundReason: dto.reason },
    });
  }

  // ── Reconciliation ───────────────────────────────────────────────

  async reconcileWithSubscription(id: string, workspaceId: string, userId: string): Promise<IReconciliationReport> {
    const billingPeriod = await this.getVisibleOrThrow(id, workspaceId);
    const discrepancies: string[] = [];

    if (billingPeriod.subscriptionId) {
      try {
        const subscription = await this.subscriptionManagementService.getSubscription(billingPeriod.subscriptionId, workspaceId);
        if (subscription.planKey && billingPeriod.subtotal > 0) {
          const snapshot = await this.planManagementService.getEntitlementSnapshot(subscription.planKey);
          const currentPrice = snapshot.prices.find((p) => p.currency === billingPeriod.currency && p.billingCycle === (billingPeriod.billingCycle as unknown as string));
          if (currentPrice && currentPrice.amount !== billingPeriod.subtotal && billingPeriod.status === BillingPeriodStatus.DRAFT) {
            discrepancies.push(
              `Plan price for '${subscription.planKey}' is now ${currentPrice.amount} ${currentPrice.currency}, but this DRAFT period's subtotal is ${billingPeriod.subtotal} — the plan changed after generation`,
            );
          }
        }
        if (subscription.currentPeriodStart.getTime() !== billingPeriod.periodStart.getTime() || subscription.currentPeriodEnd.getTime() !== billingPeriod.periodEnd.getTime()) {
          if ([BillingPeriodStatus.DRAFT, BillingPeriodStatus.PENDING].includes(billingPeriod.status)) {
            discrepancies.push('Subscription period dates no longer match this billing period — the subscription may have renewed or changed since generation');
          }
        }
      } catch {
        discrepancies.push(`Referenced subscription '${billingPeriod.subscriptionId}' could not be loaded for comparison`);
      }
    }

    if (Math.abs(billingPeriod.total - (billingPeriod.amountPaid + billingPeriod.balanceDue)) > 0.01) {
      discrepancies.push('total does not equal amountPaid + balanceDue');
    }

    const report: IReconciliationReport = {
      billingPeriodId: id,
      isConsistent: discrepancies.length === 0,
      discrepancies,
      checkedAt: new Date(),
    };

    await this.publishEvent(BillingEngineEvent.RECONCILIATION_COMPLETED, billingPeriod, userId, { isConsistent: report.isConsistent, discrepancies });
    return report;
  }

  // ── Scheduler-callable sweep (no active scheduler wired — mirrors Subscription Management / Business Rules Engine's approach) ──

  async processOverdueSweep(): Promise<{ overdue: number }> {
    const now = new Date();
    const due = await this.repository.findDueForOverdue(now);
    let overdue = 0;

    for (const billingPeriod of due) {
      await this.transition(billingPeriod, BillingPeriodStatus.OVERDUE, 'system', {
        changeType: BillingHistoryChangeType.OVERDUE,
        event: BillingEngineEvent.BILLING_PERIOD_OVERDUE,
      });
      overdue += 1;
    }

    this.logger.log(`Overdue sweep: ${overdue} billing period(s) marked OVERDUE`);
    return { overdue };
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getBillingPeriod(id: string, workspaceId: string): Promise<IBillingPeriod> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async getItems(id: string, workspaceId: string): Promise<IBillingItem[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findItems(id);
  }

  async getHistory(id: string, workspaceId: string): Promise<IBillingHistory[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllBillingPeriods(workspaceId: string, filter: BillingFilterDto): Promise<PaginatedBillingPeriodResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Billing rules ────────────────────────────────────────────────

  async createBillingRule(workspaceId: string, userId: string, userRole: string, dto: CreateBillingRuleDto): Promise<IBillingRule> {
    this.assertCanManage(userRole);

    const scopeKey = buildBillingRuleScopeKey({
      scope: dto.scope,
      workspaceId: dto.scope === BillingRuleScope.TENANT ? workspaceId : null,
      organizationId: dto.organizationId,
      planKey: dto.planKey,
      country: dto.country,
      region: dto.region,
    });

    return this.repository.createRule({
      scope: dto.scope,
      scopeKey,
      workspaceId: dto.scope === BillingRuleScope.TENANT ? workspaceId : null,
      organizationId: dto.organizationId ?? null,
      planKey: dto.planKey ?? null,
      country: dto.country ?? null,
      region: dto.region ?? null,
      priority: dto.priority ?? 0,
      taxRatePercent: dto.taxRatePercent ?? null,
      prorationStrategy: dto.prorationStrategy ?? ProrationStrategy.DAILY,
      gracePeriodDays: dto.gracePeriodDays ?? null,
      overageRates: (dto.overageRates ?? null) as any,
      isActive: dto.isActive ?? true,
      createdBy: userId,
    });
  }

  async updateBillingRule(id: string, userId: string, userRole: string, dto: UpdateBillingRuleDto): Promise<IBillingRule> {
    this.assertCanManage(userRole);
    const rule = await this.repository.findRuleById(id);
    if (!rule) {
      throw new BillingRuleNotFoundException(id);
    }

    return this.repository.updateRule(id, {
      priority: dto.priority ?? rule.priority,
      taxRatePercent: dto.taxRatePercent ?? rule.taxRatePercent,
      prorationStrategy: dto.prorationStrategy ?? rule.prorationStrategy,
      gracePeriodDays: dto.gracePeriodDays ?? rule.gracePeriodDays,
      overageRates: (dto.overageRates ?? rule.overageRates) as any,
      isActive: dto.isActive ?? rule.isActive,
    });
  }

  async listBillingRules(workspaceId: string): Promise<IBillingRule[]> {
    return this.repository.findAllRules(workspaceId);
  }

  /** Highest-priority ACTIVE rule matching TENANT > PLAN > REGION > COUNTRY > GLOBAL scope for the given identity — the same precedence-by-specificity pattern the Settings Framework uses. */
  async resolveBillingRule(
    workspaceId: string,
    organizationId: string | null,
    planKey: string | null,
    country?: string,
    region?: string,
  ): Promise<IResolvedBillingRule> {
    const candidateKeys = [
      buildBillingRuleScopeKey({ scope: BillingRuleScope.TENANT, workspaceId }),
      planKey ? buildBillingRuleScopeKey({ scope: BillingRuleScope.PLAN, planKey }) : null,
      region ? buildBillingRuleScopeKey({ scope: BillingRuleScope.REGION, region }) : null,
      country ? buildBillingRuleScopeKey({ scope: BillingRuleScope.COUNTRY, country }) : null,
      buildBillingRuleScopeKey({ scope: BillingRuleScope.GLOBAL }),
    ].filter((k): k is string => Boolean(k));

    const rules = await this.repository.findActiveRulesForResolution(candidateKeys);
    const specificityOrder = [BillingRuleScope.TENANT, BillingRuleScope.PLAN, BillingRuleScope.REGION, BillingRuleScope.COUNTRY, BillingRuleScope.GLOBAL];
    const winner = rules.sort((a, b) => specificityOrder.indexOf(a.scope) - specificityOrder.indexOf(b.scope) || b.priority - a.priority)[0];

    if (!winner) {
      return { ...DEFAULT_RESOLVED_BILLING_RULE, prorationStrategy: DEFAULT_RESOLVED_BILLING_RULE.prorationStrategy as ProrationStrategy };
    }

    return {
      taxRatePercent: winner.taxRatePercent ?? DEFAULT_RESOLVED_BILLING_RULE.taxRatePercent,
      prorationStrategy: winner.prorationStrategy,
      gracePeriodDays: winner.gracePeriodDays ?? DEFAULT_RESOLVED_BILLING_RULE.gracePeriodDays,
      overageRates: winner.overageRates ?? DEFAULT_RESOLVED_BILLING_RULE.overageRates,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async recalculateTotals(billingPeriod: IBillingPeriod, type: BillingItemType, amount: number): Promise<IBillingPeriod> {
    const fields: Partial<IBillingPeriod> = { version: billingPeriod.version + 1 };
    if (type === BillingItemType.DISCOUNT) fields.discountTotal = billingPeriod.discountTotal + amount;
    else if (type === BillingItemType.CREDIT) fields.creditTotal = billingPeriod.creditTotal + amount;
    else if (type === BillingItemType.TAX) fields.taxTotal = billingPeriod.taxTotal + amount;
    else if (type === BillingItemType.OVERAGE) fields.overageTotal = billingPeriod.overageTotal + amount;
    else fields.adjustmentTotal = billingPeriod.adjustmentTotal + amount;

    const discountTotal = fields.discountTotal ?? billingPeriod.discountTotal;
    const creditTotal = fields.creditTotal ?? billingPeriod.creditTotal;
    const taxTotal = fields.taxTotal ?? billingPeriod.taxTotal;
    const overageTotal = fields.overageTotal ?? billingPeriod.overageTotal;
    const adjustmentTotal = fields.adjustmentTotal ?? billingPeriod.adjustmentTotal;

    const total = Math.round((billingPeriod.subtotal - discountTotal - creditTotal + taxTotal + overageTotal + adjustmentTotal) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((total - billingPeriod.amountPaid) * 100) / 100);

    return this.repository.update(billingPeriod.id, { ...fields, total, balanceDue });
  }

  private async transition(billingPeriod: IBillingPeriod, to: BillingPeriodStatus, userId: string, options: ITransitionOptions): Promise<IBillingPeriod> {
    if (!BILLING_ALLOWED_TRANSITIONS[billingPeriod.status]?.includes(to)) {
      throw new BillingPeriodInvalidStateTransitionException(billingPeriod.status, to);
    }

    const updated = await this.repository.update(billingPeriod.id, {
      status: to,
      ...options.extraFields,
      version: billingPeriod.version + 1,
    });

    await this.repository.createHistory({
      billingPeriodId: billingPeriod.id,
      workspaceId: billingPeriod.workspaceId,
      changeType: options.changeType,
      fromStatus: billingPeriod.status,
      toStatus: to,
      reason: options.reason,
      changedBy: userId === 'system' ? null : userId,
      snapshot: updated as any,
    });

    await this.recordAudit(billingPeriod.workspaceId, userId, `billing-engine.billing_period.${options.changeType.toLowerCase()}`, AuditActionCategory.UPDATE, billingPeriod.id);
    await this.publishEvent(options.event, updated, userId, options.reason ? { reason: options.reason } : undefined);
    return updated;
  }

  private assertCanManage(userRole: string): void {
    if (!BILLING_MANAGE_ROLES.includes(userRole)) {
      throw new BillingAccessDeniedException();
    }
  }

  private async getVisibleOrThrow(id: string, workspaceId: string): Promise<IBillingPeriod> {
    const billingPeriod = await this.repository.findById(id);
    if (!billingPeriod || billingPeriod.workspaceId !== workspaceId) {
      throw new BillingPeriodNotFoundException(id);
    }
    return billingPeriod;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: BILLING_ENGINE_MODULE,
      entityType: 'BillingPeriod',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(event: BillingEngineEvent, billingPeriod: IBillingPeriod, actorId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({
      event,
      billingPeriodId: billingPeriod.id,
      workspaceId: billingPeriod.workspaceId,
      actorId: actorId === 'system' ? undefined : actorId,
      metadata,
    });
  }
}
