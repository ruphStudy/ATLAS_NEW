import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DocumentManagementService } from '@modules/document-management/document-management.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationType, NotificationPriority, NotificationTargetType } from '@modules/notifications/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ComplianceFrameworkRepository } from './compliance-framework.repository';
import { ComplianceFrameworkCache } from './cache/compliance-framework.cache';
import { ComplianceFrameworkEventQueue } from './jobs';
import {
  ComplianceRuleNotFoundException,
  ComplianceRuleAlreadyExistsException,
  ComplianceRuleInvalidStateTransitionException,
  ComplianceRecordNotFoundException,
  ComplianceRecordInvalidStateTransitionException,
  ComplianceAccessDeniedException,
} from './exceptions/compliance-framework.exceptions';
import {
  ComplianceRuleStatus,
  ComplianceRecordStatus,
  ComplianceFrameworkEvent,
  ComplianceIssueType,
  IComplianceRequirementRule,
  IComplianceRequirementRuleHistory,
  IComplianceRecord,
  IComplianceRecordHistory,
  IComplianceEvaluationContext,
  IComplianceRequirementOutcome,
  IComplianceIssue,
  IComplianceValidationResult,
} from './interfaces';
import {
  CreateComplianceRuleDto,
  UpdateComplianceRuleDto,
  ComplianceRuleFilterDto,
  ValidateComplianceDto,
  SubmitComplianceEvidenceDto,
  ReviewComplianceRecordDto,
  OverrideComplianceRecordDto,
  ComplianceReasonDto,
  ComplianceRecordFilterDto,
  PaginatedComplianceRuleResponseDto,
  PaginatedComplianceRecordResponseDto,
} from './dto';
import {
  COMPLIANCE_APPROVAL_ROLES,
  COMPLIANCE_DEFAULT_REMINDER_DAYS_BEFORE,
  COMPLIANCE_FRAMEWORK_MODULE,
  COMPLIANCE_RECORD_ALLOWED_TRANSITIONS,
  COMPLIANCE_RULE_ALLOWED_TRANSITIONS,
} from './constants';

@Injectable()
export class ComplianceFrameworkService {
  private readonly logger = new Logger(ComplianceFrameworkService.name);

  constructor(
    private readonly repository: ComplianceFrameworkRepository,
    private readonly cache: ComplianceFrameworkCache,
    private readonly eventQueue: ComplianceFrameworkEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly documentManagementService: DocumentManagementService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Rules ────────────────────────────────────────────────────────

  async createRule(dto: CreateComplianceRuleDto, userId?: string): Promise<IComplianceRequirementRule> {
    const workspaceId = dto.workspaceId ?? null;
    this.assertValidRuleWindow(dto.effectiveFrom, dto.effectiveTo);

    const scope = {
      countryCode: dto.countryCode ?? null,
      region: dto.region ?? null,
      marketplaceKey: dto.marketplaceKey ?? null,
      productCategory: dto.productCategory ?? null,
      supplierId: dto.supplierId ?? null,
      warehouseId: dto.warehouseId ?? null,
      businessType: dto.businessType ?? null,
    };

    const existing = await this.repository.findRuleByScope(dto.key, workspaceId, scope);
    if (existing) {
      throw new ComplianceRuleAlreadyExistsException(dto.key);
    }

    const rule = await this.repository.createRule({
      workspaceId,
      organizationId: dto.organizationId ?? null,
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      requirementType: dto.requirementType,
      actions: dto.actions,
      ...scope,
      mandatory: dto.mandatory ?? true,
      thresholds: dto.thresholds ?? {},
      exemptionCodes: dto.exemptionCodes ?? [],
      renewalPeriodDays: dto.renewalPeriodDays ?? null,
      reminderDaysBeforeExpiry: dto.reminderDaysBeforeExpiry ?? null,
      priority: dto.priority ?? 0,
      status: ComplianceRuleStatus.DRAFT,
      version: 1,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.recordRuleHistory(rule, 'Created', userId);
    await this.publishEvent(ComplianceFrameworkEvent.RULE_CREATED, { workspaceId: rule.workspaceId, ruleId: rule.id, actorId: userId });
    await this.recordAudit(
      workspaceId ?? 'global',
      userId,
      'compliance_framework.rule_created',
      AuditActionCategory.CREATE,
      'ComplianceRequirementRule',
      rule.id,
    );

    return rule;
  }

  async findRules(filter: ComplianceRuleFilterDto): Promise<PaginatedComplianceRuleResponseDto> {
    const [data, total] = await this.repository.findRules(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRuleById(id: string): Promise<IComplianceRequirementRule> {
    return this.getOrThrowRule(id);
  }

  async updateRule(id: string, dto: UpdateComplianceRuleDto, userId?: string): Promise<IComplianceRequirementRule> {
    const rule = await this.getOrThrowRule(id);
    this.assertValidRuleWindow(
      dto.effectiveFrom ?? rule.effectiveFrom.toISOString(),
      dto.effectiveTo ?? rule.effectiveTo?.toISOString(),
    );

    const patch: Partial<IComplianceRequirementRule> = {
      name: dto.name ?? undefined,
      description: dto.description ?? undefined,
      actions: dto.actions ?? undefined,
      countryCode: dto.countryCode ?? undefined,
      region: dto.region ?? undefined,
      marketplaceKey: dto.marketplaceKey ?? undefined,
      productCategory: dto.productCategory ?? undefined,
      supplierId: dto.supplierId ?? undefined,
      warehouseId: dto.warehouseId ?? undefined,
      businessType: dto.businessType ?? undefined,
      mandatory: dto.mandatory ?? undefined,
      thresholds: dto.thresholds ?? undefined,
      exemptionCodes: dto.exemptionCodes ?? undefined,
      renewalPeriodDays: dto.renewalPeriodDays ?? undefined,
      reminderDaysBeforeExpiry: dto.reminderDaysBeforeExpiry ?? undefined,
      priority: dto.priority ?? undefined,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      metadata: dto.metadata ?? undefined,
    };

    if (rule.status === ComplianceRuleStatus.DRAFT) {
      const updated = await this.repository.updateRule(id, { ...patch, updatedBy: userId ?? null });
      await this.recordRuleHistory(updated, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(ComplianceFrameworkEvent.RULE_UPDATED, { workspaceId: updated.workspaceId, ruleId: updated.id, actorId: userId });
      return updated;
    }

    if (rule.status === ComplianceRuleStatus.ARCHIVED) {
      throw new ComplianceRuleInvalidStateTransitionException(rule.status, 'DRAFT');
    }

    // ACTIVE rules are immutable — an "update" creates a new draft version, preserving the finalized one.
    const newVersion = await this.repository.createRule({
      workspaceId: rule.workspaceId,
      organizationId: rule.organizationId,
      key: rule.key,
      name: patch.name ?? rule.name,
      description: patch.description ?? rule.description,
      requirementType: rule.requirementType,
      actions: patch.actions ?? rule.actions,
      countryCode: patch.countryCode ?? rule.countryCode,
      region: patch.region ?? rule.region,
      marketplaceKey: patch.marketplaceKey ?? rule.marketplaceKey,
      productCategory: patch.productCategory ?? rule.productCategory,
      supplierId: patch.supplierId ?? rule.supplierId,
      warehouseId: patch.warehouseId ?? rule.warehouseId,
      businessType: patch.businessType ?? rule.businessType,
      mandatory: patch.mandatory ?? rule.mandatory,
      thresholds: patch.thresholds ?? rule.thresholds,
      exemptionCodes: patch.exemptionCodes ?? rule.exemptionCodes,
      renewalPeriodDays: patch.renewalPeriodDays ?? rule.renewalPeriodDays,
      reminderDaysBeforeExpiry: patch.reminderDaysBeforeExpiry ?? rule.reminderDaysBeforeExpiry,
      priority: patch.priority ?? rule.priority,
      status: ComplianceRuleStatus.DRAFT,
      version: rule.version + 1,
      supersedesId: rule.id,
      effectiveFrom: patch.effectiveFrom ?? new Date(),
      effectiveTo: patch.effectiveTo ?? rule.effectiveTo,
      metadata: patch.metadata ?? rule.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    await this.recordRuleHistory(newVersion, dto.changeReason ?? `New version of rule ${rule.id}`, userId);
    await this.publishEvent(ComplianceFrameworkEvent.RULE_UPDATED, { workspaceId: newVersion.workspaceId, ruleId: newVersion.id, actorId: userId });
    return newVersion;
  }

  async activateRule(id: string, userId?: string): Promise<IComplianceRequirementRule> {
    const rule = await this.getOrThrowRule(id);
    this.assertRuleTransition(rule.status, ComplianceRuleStatus.ACTIVE);

    if (rule.supersedesId) {
      const previous = await this.repository.findRuleById(rule.supersedesId);
      if (previous && previous.status === ComplianceRuleStatus.ACTIVE) {
        const archivedPrevious = await this.repository.updateRule(previous.id, { status: ComplianceRuleStatus.ARCHIVED });
        await this.recordRuleHistory(archivedPrevious, `Superseded by version ${rule.version}`, userId);
      }
    }

    const updated = await this.repository.updateRule(id, { status: ComplianceRuleStatus.ACTIVE, updatedBy: userId ?? null });
    await this.recordRuleHistory(updated, 'Activated', userId);
    this.cache.invalidate(updated.workspaceId);
    await this.publishEvent(ComplianceFrameworkEvent.RULE_ACTIVATED, { workspaceId: updated.workspaceId, ruleId: updated.id, actorId: userId });
    await this.recordAudit(
      updated.workspaceId ?? 'global',
      userId,
      'compliance_framework.rule_activated',
      AuditActionCategory.PUBLISH,
      'ComplianceRequirementRule',
      updated.id,
    );
    return updated;
  }

  async archiveRule(id: string, dto: ComplianceReasonDto, userId?: string): Promise<IComplianceRequirementRule> {
    const rule = await this.getOrThrowRule(id);
    this.assertRuleTransition(rule.status, ComplianceRuleStatus.ARCHIVED);

    const updated = await this.repository.updateRule(id, { status: ComplianceRuleStatus.ARCHIVED, updatedBy: userId ?? null });
    await this.recordRuleHistory(updated, dto.reason, userId);
    this.cache.invalidate(updated.workspaceId);
    await this.publishEvent(ComplianceFrameworkEvent.RULE_ARCHIVED, { workspaceId: updated.workspaceId, ruleId: updated.id, actorId: userId });
    return updated;
  }

  async getRuleHistory(id: string): Promise<IComplianceRequirementRuleHistory[]> {
    await this.getOrThrowRule(id);
    return this.repository.findRuleHistory(id);
  }

  // ── Validation (the gate other modules call) ──────────────────────

  async validateAction(
    workspaceId: string,
    dto: ValidateComplianceDto,
    userId?: string,
  ): Promise<IComplianceValidationResult> {
    const context: IComplianceEvaluationContext = {
      workspaceId,
      organizationId: dto.organizationId ?? null,
      action: dto.action,
      subjectType: dto.subjectType,
      subjectId: dto.subjectId,
      countryCode: dto.countryCode ?? null,
      region: dto.region ?? null,
      marketplaceKey: dto.marketplaceKey ?? null,
      productCategory: dto.productCategory ?? null,
      supplierId: dto.supplierId ?? null,
      warehouseId: dto.warehouseId ?? null,
      businessType: dto.businessType ?? null,
      exemptionCodes: dto.exemptionCodes ?? [],
    };

    const { matched, issues } = await this.resolveApplicableRules(workspaceId, context);
    const now = new Date();
    const requirements: IComplianceRequirementOutcome[] = [];
    const warnings: string[] = [];

    for (const rule of matched) {
      const isExempted = context.exemptionCodes?.some((code) => rule.exemptionCodes.includes(code)) ?? false;

      if (isExempted) {
        requirements.push({
          ruleId: rule.id,
          ruleKey: rule.key,
          name: rule.name,
          requirementType: rule.requirementType,
          mandatory: rule.mandatory,
          status: ComplianceRecordStatus.NON_APPLICABLE,
          reason: 'Exempted',
        });
        continue;
      }

      let record = await this.repository.findRecord(workspaceId, rule.id, context.subjectType, context.subjectId);
      let status: ComplianceRecordStatus;

      if (!record) {
        if (!rule.mandatory) {
          requirements.push({
            ruleId: rule.id,
            ruleKey: rule.key,
            name: rule.name,
            requirementType: rule.requirementType,
            mandatory: rule.mandatory,
            status: ComplianceRecordStatus.NON_APPLICABLE,
          });
          continue;
        }

        record = await this.repository.createRecord({
          workspaceId,
          organizationId: context.organizationId ?? null,
          ruleId: rule.id,
          ruleKey: rule.key,
          ruleVersion: rule.version,
          subjectType: context.subjectType,
          subjectId: context.subjectId,
          status: ComplianceRecordStatus.REQUIRED,
          evaluationSnapshot: { rule: this.snapshotRule(rule), context },
          lastCheckedAt: now,
          isOverride: false,
          metadata: {},
          createdBy: userId ?? null,
        });
        status = ComplianceRecordStatus.REQUIRED;
        await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_REQUIRED, {
          workspaceId,
          ruleId: rule.id,
          recordId: record.id,
          subjectType: context.subjectType,
          subjectId: context.subjectId,
          actorId: userId,
        });
      } else {
        status = record.status;
        if (status === ComplianceRecordStatus.COMPLIANT && record.expiresAt && record.expiresAt < now) {
          status = ComplianceRecordStatus.EXPIRED;
          issues.push({ type: ComplianceIssueType.EXPIRED_RECORD, ruleKey: rule.key, message: `${rule.name} expired on ${record.expiresAt.toISOString()}` });
        }
      }

      requirements.push({
        ruleId: rule.id,
        ruleKey: rule.key,
        name: rule.name,
        requirementType: rule.requirementType,
        mandatory: rule.mandatory,
        status,
        recordId: record?.id ?? null,
      });
    }

    const blockingRequirements = requirements.filter(
      (r) =>
        r.mandatory &&
        ![ComplianceRecordStatus.COMPLIANT, ComplianceRecordStatus.WAIVED, ComplianceRecordStatus.NON_APPLICABLE].includes(
          r.status,
        ),
    );

    return {
      compliant: blockingRequirements.length === 0,
      requirements,
      blockingRequirements,
      issues,
      warnings,
      evaluatedAt: now,
    };
  }

  // ── Records ──────────────────────────────────────────────────────

  async findRecords(workspaceId: string, filter: ComplianceRecordFilterDto): Promise<PaginatedComplianceRecordResponseDto> {
    const [data, total] = await this.repository.findRecords({ ...filter, workspaceId });
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRecordById(id: string, workspaceId: string): Promise<IComplianceRecord> {
    return this.getOrThrowRecord(id, workspaceId);
  }

  async getRequirementsForSubject(workspaceId: string, subjectType: string, subjectId: string): Promise<IComplianceRecord[]> {
    return this.repository.findRecordsBySubject(workspaceId, subjectType, subjectId);
  }

  async getRecordHistory(id: string, workspaceId: string): Promise<IComplianceRecordHistory[]> {
    await this.getOrThrowRecord(id, workspaceId);
    return this.repository.findRecordHistory(id);
  }

  async submitEvidence(
    id: string,
    workspaceId: string,
    userId: string,
    dto: SubmitComplianceEvidenceDto,
  ): Promise<IComplianceRecord> {
    const record = await this.getOrThrowRecord(id, workspaceId);
    this.assertRecordTransition(record.status, ComplianceRecordStatus.PENDING);

    if (dto.evidenceDocumentId) {
      try {
        await this.documentManagementService.linkEntity(dto.evidenceDocumentId, workspaceId, userId, {
          entityType: 'ComplianceRecord',
          entityId: record.id,
        });
      } catch (err) {
        this.logger.warn(`Failed to link evidence document '${dto.evidenceDocumentId}': ${(err as Error).message}`);
      }
    }

    const updated = await this.repository.updateRecord(id, {
      status: ComplianceRecordStatus.PENDING,
      referenceNumber: dto.referenceNumber ?? record.referenceNumber,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : record.issuedAt,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : record.expiresAt,
      evidenceDocumentId: dto.evidenceDocumentId ?? record.evidenceDocumentId,
      lastCheckedAt: new Date(),
    });

    await this.recordRecordHistory(updated, record.status, 'Evidence submitted', userId);
    await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_EVIDENCE_SUBMITTED, {
      workspaceId,
      recordId: id,
      ruleId: record.ruleId,
      actorId: userId,
    });
    return updated;
  }

  async reviewRecord(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: ReviewComplianceRecordDto,
  ): Promise<IComplianceRecord> {
    this.assertCanReview(userRole);
    const record = await this.getOrThrowRecord(id, workspaceId);
    const target = dto.decision === 'APPROVE' ? ComplianceRecordStatus.COMPLIANT : ComplianceRecordStatus.REJECTED;
    this.assertRecordTransition(record.status, target);

    const updated = await this.repository.updateRecord(id, {
      status: target,
      reviewedBy: userId,
      reviewedAt: new Date(),
      decisionReason: dto.reason ?? null,
      lastCheckedAt: new Date(),
    });

    await this.recordRecordHistory(updated, record.status, dto.reason ?? dto.decision, userId);
    await this.publishEvent(
      target === ComplianceRecordStatus.COMPLIANT ? ComplianceFrameworkEvent.COMPLIANCE_APPROVED : ComplianceFrameworkEvent.COMPLIANCE_FAILED,
      { workspaceId, recordId: id, ruleId: record.ruleId, actorId: userId },
    );
    await this.recordAudit(
      workspaceId,
      userId,
      target === ComplianceRecordStatus.COMPLIANT ? 'compliance_framework.record_approved' : 'compliance_framework.record_rejected',
      target === ComplianceRecordStatus.COMPLIANT ? AuditActionCategory.APPROVE : AuditActionCategory.REJECT,
      'ComplianceRecord',
      id,
    );

    if (target === ComplianceRecordStatus.REJECTED) {
      await this.notifyWorkspace(workspaceId, 'Compliance requirement rejected', `${record.ruleKey}: ${dto.reason ?? 'No reason provided'}`, NotificationType.ERROR);
    }

    return updated;
  }

  async waiveRecord(id: string, workspaceId: string, userId: string, dto: ComplianceReasonDto): Promise<IComplianceRecord> {
    const record = await this.getOrThrowRecord(id, workspaceId);
    this.assertRecordTransition(record.status, ComplianceRecordStatus.WAIVED);

    const updated = await this.repository.updateRecord(id, {
      status: ComplianceRecordStatus.WAIVED,
      isOverride: true,
      decisionReason: dto.reason,
      reviewedBy: userId,
      reviewedAt: new Date(),
    });

    await this.recordRecordHistory(updated, record.status, dto.reason, userId);
    await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_WAIVED, { workspaceId, recordId: id, ruleId: record.ruleId, actorId: userId });
    await this.recordAudit(workspaceId, userId, 'compliance_framework.record_waived', AuditActionCategory.UPDATE, 'ComplianceRecord', id);
    return updated;
  }

  async markNonApplicable(id: string, workspaceId: string, userId: string, dto: ComplianceReasonDto): Promise<IComplianceRecord> {
    const record = await this.getOrThrowRecord(id, workspaceId);
    this.assertRecordTransition(record.status, ComplianceRecordStatus.NON_APPLICABLE);

    const updated = await this.repository.updateRecord(id, {
      status: ComplianceRecordStatus.NON_APPLICABLE,
      isOverride: true,
      decisionReason: dto.reason,
      reviewedBy: userId,
      reviewedAt: new Date(),
    });

    await this.recordRecordHistory(updated, record.status, dto.reason, userId);
    await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_OVERRIDDEN, { workspaceId, recordId: id, ruleId: record.ruleId, actorId: userId });
    return updated;
  }

  /** Generic manual override — always requires a reason, and (unlike the other transitions) is not restricted by the normal status map. */
  async overrideStatus(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: OverrideComplianceRecordDto,
  ): Promise<IComplianceRecord> {
    this.assertCanReview(userRole);
    const record = await this.getOrThrowRecord(id, workspaceId);

    const updated = await this.repository.updateRecord(id, {
      status: dto.status,
      isOverride: true,
      decisionReason: dto.reason,
      reviewedBy: userId,
      reviewedAt: new Date(),
    });

    await this.recordRecordHistory(updated, record.status, dto.reason, userId);
    await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_OVERRIDDEN, { workspaceId, recordId: id, ruleId: record.ruleId, actorId: userId });
    await this.recordAudit(workspaceId, userId, 'compliance_framework.record_overridden', AuditActionCategory.UPDATE, 'ComplianceRecord', id);
    return updated;
  }

  // ── Expiry (scheduler-callable; no active scheduler is wired) ────

  async processExpired(): Promise<number> {
    const now = new Date();
    const expired = await this.repository.findExpiredAsOf(now);

    for (const record of expired) {
      const updated = await this.repository.updateRecord(record.id, { status: ComplianceRecordStatus.EXPIRED });
      await this.recordRecordHistory(updated, record.status, 'Expired', undefined);
      await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_EXPIRED, {
        workspaceId: record.workspaceId,
        recordId: record.id,
        ruleId: record.ruleId,
      });
      await this.notifyWorkspace(
        record.workspaceId,
        'Compliance requirement expired',
        `${record.ruleKey} expired for ${record.subjectType} ${record.subjectId}`,
        NotificationType.ERROR,
      );
    }

    return expired.length;
  }

  async publishExpiringReminders(): Promise<number> {
    const now = new Date();
    const maxWindowEnd = new Date(now.getTime() + COMPLIANCE_DEFAULT_REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000);
    const candidates = await this.repository.findExpiringBetween(now, maxWindowEnd);

    let flipped = 0;
    for (const record of candidates) {
      const rule = await this.repository.findRuleById(record.ruleId);
      const reminderDays = rule?.reminderDaysBeforeExpiry ?? COMPLIANCE_DEFAULT_REMINDER_DAYS_BEFORE;
      const reminderThreshold = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);
      if (!record.expiresAt || record.expiresAt > reminderThreshold) continue;

      const updated = await this.repository.updateRecord(record.id, { status: ComplianceRecordStatus.EXPIRING });
      await this.recordRecordHistory(updated, record.status, 'Expiring soon', undefined);
      await this.publishEvent(ComplianceFrameworkEvent.COMPLIANCE_EXPIRING, {
        workspaceId: record.workspaceId,
        recordId: record.id,
        ruleId: record.ruleId,
        metadata: { expiresAt: record.expiresAt },
      });
      await this.notifyWorkspace(
        record.workspaceId,
        'Compliance requirement expiring soon',
        `${record.ruleKey} expires on ${record.expiresAt.toISOString()} for ${record.subjectType} ${record.subjectId}`,
        NotificationType.WARNING,
      );
      flipped += 1;
    }

    return flipped;
  }

  invalidateCache(workspaceId?: string | null): void {
    this.cache.invalidate(workspaceId);
  }

  // ── Resolver (specificity-scored rule matching, global → workspace overrides) ──

  private async resolveApplicableRules(
    workspaceId: string,
    context: IComplianceEvaluationContext,
  ): Promise<{ matched: IComplianceRequirementRule[]; issues: IComplianceIssue[] }> {
    let rules = this.cache.getActiveRules(workspaceId);
    if (!rules) {
      rules = await this.repository.findActiveRulesForWorkspace(workspaceId);
      this.cache.setActiveRules(workspaceId, rules);
    }

    const matching = rules.filter((rule) => rule.actions.includes(context.action) && this.matchesScope(rule, context));

    const byKey = new Map<string, IComplianceRequirementRule[]>();
    for (const rule of matching) {
      const list = byKey.get(rule.key) ?? [];
      list.push(rule);
      byKey.set(rule.key, list);
    }

    const matched: IComplianceRequirementRule[] = [];
    const issues: IComplianceIssue[] = [];

    for (const [key, candidates] of byKey.entries()) {
      if (candidates.length === 1) {
        matched.push(candidates[0]);
        continue;
      }
      const scored = candidates
        .map((rule) => ({ rule, score: this.scoreSpecificity(rule) }))
        .sort((a, b) => b.score - a.score);

      if (scored[0].score === scored[1].score) {
        issues.push({
          type: ComplianceIssueType.CONFLICTING_RULES,
          ruleKey: key,
          message: `Multiple equally-specific compliance rules match key '${key}' for this context`,
        });
      }
      matched.push(scored[0].rule);
    }

    return { matched, issues };
  }

  private matchesScope(rule: IComplianceRequirementRule, context: IComplianceEvaluationContext): boolean {
    const pairs: [unknown, unknown][] = [
      [rule.countryCode, context.countryCode],
      [rule.region, context.region],
      [rule.marketplaceKey, context.marketplaceKey],
      [rule.productCategory, context.productCategory],
      [rule.supplierId, context.supplierId],
      [rule.warehouseId, context.warehouseId],
      [rule.businessType, context.businessType],
    ];
    return pairs.every(([ruleValue, contextValue]) => ruleValue === null || ruleValue === undefined || ruleValue === contextValue);
  }

  private scoreSpecificity(rule: IComplianceRequirementRule): number {
    const scopeFields = [
      rule.countryCode,
      rule.region,
      rule.marketplaceKey,
      rule.productCategory,
      rule.supplierId,
      rule.warehouseId,
      rule.businessType,
    ];
    const nonNullCount = scopeFields.filter((f) => f !== null && f !== undefined).length;
    return (rule.workspaceId ? 1000 : 0) + nonNullCount * 10 + rule.priority;
  }

  private snapshotRule(rule: IComplianceRequirementRule): Record<string, unknown> {
    return { ...rule };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getOrThrowRule(id: string): Promise<IComplianceRequirementRule> {
    const rule = await this.repository.findRuleById(id);
    if (!rule) throw new ComplianceRuleNotFoundException(id);
    return rule;
  }

  private async getOrThrowRecord(id: string, workspaceId: string): Promise<IComplianceRecord> {
    const record = await this.repository.findRecordById(id, workspaceId);
    if (!record) throw new ComplianceRecordNotFoundException(id);
    return record;
  }

  private assertCanReview(userRole: string): void {
    if (!COMPLIANCE_APPROVAL_ROLES.includes(userRole)) {
      throw new ComplianceAccessDeniedException();
    }
  }

  private assertRuleTransition(from: ComplianceRuleStatus, to: ComplianceRuleStatus): void {
    if (!COMPLIANCE_RULE_ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throw new ComplianceRuleInvalidStateTransitionException(from, to);
    }
  }

  private assertRecordTransition(from: ComplianceRecordStatus, to: ComplianceRecordStatus): void {
    if (!COMPLIANCE_RECORD_ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throw new ComplianceRecordInvalidStateTransitionException(from, to);
    }
  }

  private assertValidRuleWindow(effectiveFrom?: string, effectiveTo?: string | null): void {
    if (effectiveFrom && effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      throw new BadRequestException('effectiveTo must be after effectiveFrom');
    }
  }

  private async recordRuleHistory(
    rule: IComplianceRequirementRule,
    changeReason: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      await this.repository.createRuleHistory({
        ruleId: rule.id,
        workspaceId: rule.workspaceId,
        status: rule.status,
        version: rule.version,
        snapshot: this.snapshotRule(rule),
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Failed to write rule history for '${rule.id}': ${(err as Error).message}`);
    }
  }

  private async recordRecordHistory(
    record: IComplianceRecord,
    fromStatus: ComplianceRecordStatus | undefined,
    reason: string | undefined,
    changedBy?: string,
  ): Promise<void> {
    try {
      await this.repository.createRecordHistory({
        recordId: record.id,
        workspaceId: record.workspaceId,
        fromStatus: fromStatus ?? null,
        toStatus: record.status,
        reason: reason ?? null,
        changedBy: changedBy ?? null,
        snapshot: { ...record },
      });
    } catch (err) {
      this.logger.warn(`Failed to write record history for '${record.id}': ${(err as Error).message}`);
    }
  }

  private async publishEvent(
    event: ComplianceFrameworkEvent,
    fields: {
      workspaceId?: string | null;
      ruleId?: string | null;
      recordId?: string | null;
      subjectType?: string | null;
      subjectId?: string | null;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      workspaceId: fields.workspaceId ?? null,
      ruleId: fields.ruleId ?? null,
      recordId: fields.recordId ?? null,
      subjectType: fields.subjectType ?? null,
      subjectId: fields.subjectId ?? null,
      actorId: fields.actorId,
      metadata: fields.metadata,
    });
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string | undefined,
    action: string,
    actionCategory: AuditActionCategory,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId,
        action,
        actionCategory,
        module: COMPLIANCE_FRAMEWORK_MODULE,
        entityType,
        entityId,
        outcome: ActivityOutcome.SUCCESS,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }

  private async notifyWorkspace(workspaceId: string, title: string, message: string, type: NotificationType): Promise<void> {
    try {
      const dto: CreateNotificationDto = {
        workspaceId,
        targetType: NotificationTargetType.WORKSPACE,
        type,
        priority: type === NotificationType.ERROR ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
        category: COMPLIANCE_FRAMEWORK_MODULE,
        title,
        message,
        actionRequired: type !== NotificationType.INFO,
      } as CreateNotificationDto;
      await this.notificationsService.create(dto);
    } catch (err) {
      this.logger.warn(`Failed to notify workspace '${workspaceId}': ${(err as Error).message}`);
    }
  }
}
