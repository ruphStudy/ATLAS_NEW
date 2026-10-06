import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiGuardrailsRepository } from './ai-guardrails.repository';
import { AiGuardrailEventQueue } from './jobs';
import {
  PatternMatchCheck,
  AllowlistCheck,
  BlocklistCheck,
  RolePermissionCheck,
  ToolPermissionCheck,
  ActionLimitCheck,
} from './checks';
import {
  EvaluateGuardrailDto,
  CreateGuardrailRuleDto,
  UpdateGuardrailRuleDto,
  GuardrailRuleFilterDto,
  CreateGuardrailOverrideDto,
  UpdateGuardrailOverrideDto,
  GuardrailOverrideFilterDto,
  GuardrailEvaluationFilterDto,
  GuardrailIncidentFilterDto,
  UpdateGuardrailIncidentDto,
  GuardrailApprovalFilterDto,
  DecideGuardrailApprovalDto,
  PaginatedGuardrailRuleResponseDto,
  PaginatedGuardrailOverrideResponseDto,
  PaginatedGuardrailEvaluationResponseDto,
  PaginatedGuardrailIncidentResponseDto,
  PaginatedGuardrailApprovalResponseDto,
} from './dto';
import {
  IAiGuardrailRule,
  IAiGuardrailRuleVersion,
  IAiGuardrailOverride,
  IAiGuardrailEvaluation,
  IAiGuardrailEvaluationResult,
  IAiGuardrailIncident,
  IAiGuardrailIncidentHistory,
  IAiGuardrailApproval,
  IAiGuardrailApprovalHistory,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailEvaluationOutcome,
  IGuardrailRuleMatch,
  GuardrailCheckType,
  GuardrailSeverity,
  GuardrailDecision,
  GuardrailIncidentStatus,
  GuardrailApprovalStatus,
  GuardrailEvaluationStatus,
  GuardrailOverrideScope,
  GuardrailViolationCategory,
  AiGuardrailEvent,
  GUARDRAIL_DECISION_RANK,
  GUARDRAIL_SEVERITY_RANK,
} from './interfaces';
import {
  AiGuardrailRuleNotFoundException,
  AiGuardrailRuleDuplicateException,
  AiGuardrailOverrideNotFoundException,
  AiGuardrailIncidentNotFoundException,
  AiGuardrailApprovalNotFoundException,
  AiGuardrailApprovalAlreadyDecidedException,
  AiGuardrailEvaluationNotFoundException,
} from './exceptions/ai-guardrail.exceptions';
import { GUARDRAIL_RISK_SCORE_MAX } from './constants';
import { clamp } from '@common/utils';

const SEVERITY_RISK_WEIGHT: Record<GuardrailSeverity, number> = {
  [GuardrailSeverity.INFO]: 5,
  [GuardrailSeverity.LOW]: 15,
  [GuardrailSeverity.MEDIUM]: 30,
  [GuardrailSeverity.HIGH]: 55,
  [GuardrailSeverity.CRITICAL]: 85,
};

const OVERRIDE_SCOPE_RANK: Record<GuardrailOverrideScope, number> = {
  [GuardrailOverrideScope.GLOBAL]: 1,
  [GuardrailOverrideScope.WORKSPACE]: 2,
  [GuardrailOverrideScope.PROVIDER]: 3,
  [GuardrailOverrideScope.MODEL]: 4,
};

const INCIDENT_TRIGGER_SEVERITIES: GuardrailSeverity[] = [
  GuardrailSeverity.HIGH,
  GuardrailSeverity.CRITICAL,
];

@Injectable()
export class AiGuardrailsService {
  private readonly logger = new Logger(AiGuardrailsService.name);
  private readonly checks: Map<GuardrailCheckType, IGuardrailCheck> = new Map();

  constructor(
    private readonly repository: AiGuardrailsRepository,
    private readonly eventQueue: AiGuardrailEventQueue,
    patternMatchCheck: PatternMatchCheck,
    allowlistCheck: AllowlistCheck,
    blocklistCheck: BlocklistCheck,
    rolePermissionCheck: RolePermissionCheck,
    toolPermissionCheck: ToolPermissionCheck,
    actionLimitCheck: ActionLimitCheck,
  ) {
    for (const check of [
      patternMatchCheck,
      allowlistCheck,
      blocklistCheck,
      rolePermissionCheck,
      toolPermissionCheck,
      actionLimitCheck,
    ]) {
      this.checks.set(check.checkType, check);
    }
  }

  // ── Evaluation pipeline ──────────────────────────────────────────

  async evaluate(dto: EvaluateGuardrailDto): Promise<IGuardrailEvaluationOutcome> {
    const applicableRules = await this.repository.findApplicableRules({
      workspaceId: dto.workspaceId,
      stage: dto.stage,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
    });

    const overrides = applicableRules.length
      ? await this.repository.findApplicableOverrides({
          workspaceId: dto.workspaceId,
          providerKey: dto.modelProvider,
          modelId: dto.modelId,
          ruleIds: applicableRules.map((r) => r.id),
        })
      : [];

    const context: IGuardrailCheckContext = {
      stage: dto.stage,
      workspaceId: dto.workspaceId,
      content: dto.content,
      toolName: dto.toolName,
      actionName: dto.actionName,
      userRole: dto.userRole,
      actionCount: dto.actionCount,
      metadata: dto.metadata,
    };

    const matches: IGuardrailRuleMatch[] = [];
    let workingContent = dto.content;
    const resultRows: Array<{
      ruleId: string | null;
      ruleName: string;
      category: GuardrailViolationCategory;
      matched: boolean;
      severity: GuardrailSeverity;
      decision: GuardrailDecision;
      reason: string;
      matchCount: number;
    }> = [];

    for (const rule of applicableRules) {
      const override = this.resolveEffectiveOverride(rule, overrides);

      const effectiveEnabled = override?.enabledOverride ?? true;
      if (!effectiveEnabled) {
        continue;
      }

      const check = this.checks.get(rule.checkType);
      if (!check) {
        this.logger.warn(`No guardrail check registered for type: ${rule.checkType}`);
        continue;
      }

      const outcome = await check.evaluate(rule, context);
      const effectiveSeverity = override?.severityOverride ?? rule.severity;
      const effectiveDecision = override?.decisionOverride ?? rule.decision;

      resultRows.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        matched: outcome.matched,
        severity: effectiveSeverity,
        decision: effectiveDecision,
        reason: outcome.reason,
        matchCount: outcome.matchCount ?? 0,
      });

      if (outcome.matched) {
        matches.push({ rule, outcome, effectiveSeverity, effectiveDecision });

        if (outcome.redactedContent && workingContent) {
          workingContent = outcome.redactedContent;
        }

        if (rule.stopOnMatch) {
          break;
        }
      }
    }

    const riskScore = clamp(
      matches.reduce(
        (sum, m) => sum + SEVERITY_RISK_WEIGHT[m.effectiveSeverity] * m.rule.riskWeight,
        0,
      ),
      0,
      GUARDRAIL_RISK_SCORE_MAX,
    );

    const severity = matches.reduce(
      (worst, m) =>
        GUARDRAIL_SEVERITY_RANK[m.effectiveSeverity] > GUARDRAIL_SEVERITY_RANK[worst]
          ? m.effectiveSeverity
          : worst,
      GuardrailSeverity.INFO,
    );

    const decision = matches.reduce(
      (worst, m) =>
        GUARDRAIL_DECISION_RANK[m.effectiveDecision] > GUARDRAIL_DECISION_RANK[worst]
          ? m.effectiveDecision
          : worst,
      GuardrailDecision.ALLOW,
    );

    const reasons = matches.map((m) => `${m.rule.name}: ${m.outcome.reason}`);
    const requiresApproval =
      decision === GuardrailDecision.REQUIRE_REVIEW ||
      matches.some((m) => m.rule.requiresApproval);

    const evaluation = await this.repository.createEvaluation({
      workspaceId: dto.workspaceId,
      stage: dto.stage,
      status: GuardrailEvaluationStatus.COMPLETED,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
      modelId: dto.modelId,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentExecutionId: dto.agentExecutionId,
      workflowExecutionId: dto.workflowExecutionId,
      toolName: dto.toolName,
      actionName: dto.actionName,
      userId: dto.userId,
      userRole: dto.userRole,
      contentHash: dto.content ? this.hashContent(dto.content) : null,
      contentLength: dto.content?.length ?? null,
      riskScore,
      severity,
      decision,
      reasons,
      matchedRuleCount: matches.length,
      requiresApproval,
      metadata: {},
    });

    await Promise.all(
      resultRows.map((row) =>
        this.repository.createEvaluationResult({
          evaluationId: evaluation.id,
          workspaceId: dto.workspaceId,
          ruleId: row.ruleId,
          ruleName: row.ruleName,
          category: row.category,
          matched: row.matched,
          severity: row.severity,
          decision: row.decision,
          reason: row.reason,
          matchCount: row.matchCount,
          metadata: {},
        }),
      ),
    );

    let incidentId: string | undefined;
    if (
      decision === GuardrailDecision.BLOCK ||
      INCIDENT_TRIGGER_SEVERITIES.includes(severity)
    ) {
      const topMatch = matches[0];
      const incident = await this.repository.createIncident({
        workspaceId: dto.workspaceId,
        evaluationId: evaluation.id,
        category: topMatch?.rule.category ?? GuardrailViolationCategory.OTHER,
        severity,
        decision,
        status: GuardrailIncidentStatus.OPEN,
        description: reasons.join('; ') || `Guardrail evaluation flagged with decision ${decision}`,
        reportedBy: dto.userId,
        metadata: {},
      });
      incidentId = incident.id;

      await this.eventQueue.publish({
        event: AiGuardrailEvent.INCIDENT_REPORTED,
        workspaceId: dto.workspaceId,
        evaluationId: evaluation.id,
        incidentId: incident.id,
        decision,
        severity,
      });
    }

    let approvalId: string | undefined;
    if (requiresApproval) {
      const topMatch = matches[0];
      const approval = await this.repository.createApproval({
        workspaceId: dto.workspaceId,
        evaluationId: evaluation.id,
        status: GuardrailApprovalStatus.PENDING,
        stage: dto.stage,
        category: topMatch?.rule.category ?? GuardrailViolationCategory.OTHER,
        severity,
        requestedBy: dto.userId,
        metadata: {},
      });
      approvalId = approval.id;

      await this.eventQueue.publish({
        event: AiGuardrailEvent.APPROVAL_REQUESTED,
        workspaceId: dto.workspaceId,
        evaluationId: evaluation.id,
        approvalId: approval.id,
        decision,
        severity,
      });
    }

    const completionEvent =
      decision === GuardrailDecision.BLOCK
        ? AiGuardrailEvent.EVALUATION_BLOCKED
        : decision === GuardrailDecision.WARN
        ? AiGuardrailEvent.EVALUATION_WARNED
        : AiGuardrailEvent.EVALUATION_COMPLETED;

    await this.eventQueue.publish({
      event: completionEvent,
      workspaceId: dto.workspaceId,
      evaluationId: evaluation.id,
      decision,
      severity,
    });

    return {
      evaluationId: evaluation.id,
      stage: dto.stage,
      riskScore,
      severity,
      decision,
      reasons,
      matchedRuleCount: matches.length,
      requiresApproval,
      approvalId,
      incidentId,
      redactedContent:
        decision === GuardrailDecision.REDACT ? workingContent : undefined,
    };
  }

  private resolveEffectiveOverride(
    rule: IAiGuardrailRule,
    overrides: IAiGuardrailOverride[],
  ): IAiGuardrailOverride | undefined {
    const applicable = overrides.filter(
      (o) => o.ruleId === rule.id || o.ruleId === null || o.ruleId === undefined,
    );

    if (applicable.length === 0) return undefined;

    return applicable.sort((a, b) => {
      const ruleSpecificA = a.ruleId ? 1 : 0;
      const ruleSpecificB = b.ruleId ? 1 : 0;
      if (ruleSpecificA !== ruleSpecificB) return ruleSpecificB - ruleSpecificA;

      const scopeA = OVERRIDE_SCOPE_RANK[a.scope];
      const scopeB = OVERRIDE_SCOPE_RANK[b.scope];
      if (scopeA !== scopeB) return scopeB - scopeA;

      return b.priority - a.priority;
    })[0];
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  // ── Rules ────────────────────────────────────────────────────────

  async createRule(dto: CreateGuardrailRuleDto): Promise<IAiGuardrailRule> {
    const existing = await this.repository.findRuleByName(dto.name, dto.workspaceId);
    if (existing) {
      throw new AiGuardrailRuleDuplicateException(dto.name);
    }

    const rule = await this.repository.createRule({
      workspaceId: dto.workspaceId,
      name: dto.name,
      description: dto.description,
      stage: dto.stage,
      category: dto.category,
      checkType: dto.checkType,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
      enabled: dto.enabled ?? true,
      config: dto.config,
      severity: dto.severity ?? GuardrailSeverity.MEDIUM,
      decision: dto.decision ?? GuardrailDecision.BLOCK,
      riskWeight: dto.riskWeight ?? 1.0,
      requiresApproval: dto.requiresApproval ?? false,
      priority: dto.priority ?? 0,
      stopOnMatch: dto.stopOnMatch ?? false,
      version: 1,
      tags: dto.tags ?? [],
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.repository.createRuleVersion({
      ruleId: rule.id,
      workspaceId: rule.workspaceId,
      version: 1,
      snapshot: rule as unknown as Record<string, unknown>,
      changedBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.RULE_CREATED,
      workspaceId: rule.workspaceId ?? dto.workspaceId ?? 'global',
      ruleId: rule.id,
    });

    return rule;
  }

  async updateRule(
    id: string,
    dto: UpdateGuardrailRuleDto,
  ): Promise<IAiGuardrailRule> {
    const existing = await this.findRuleById(id);
    const nextVersion = existing.version + 1;

    const updated = await this.repository.updateRule(id, {
      name: dto.name,
      description: dto.description,
      stage: dto.stage,
      category: dto.category,
      checkType: dto.checkType,
      capability: dto.capability,
      useCase: dto.useCase,
      modelProvider: dto.modelProvider,
      enabled: dto.enabled,
      config: dto.config,
      severity: dto.severity,
      decision: dto.decision,
      riskWeight: dto.riskWeight,
      requiresApproval: dto.requiresApproval,
      priority: dto.priority,
      stopOnMatch: dto.stopOnMatch,
      tags: dto.tags,
      metadata: dto.metadata,
      version: nextVersion,
      updatedBy: dto.changedBy,
    });

    await this.repository.createRuleVersion({
      ruleId: id,
      workspaceId: updated.workspaceId,
      version: nextVersion,
      snapshot: updated as unknown as Record<string, unknown>,
      changeReason: dto.changeReason,
      changedBy: dto.changedBy,
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.RULE_UPDATED,
      workspaceId: updated.workspaceId ?? 'global',
      ruleId: updated.id,
    });

    return updated;
  }

  async deleteRule(id: string): Promise<void> {
    const existing = await this.findRuleById(id);
    await this.repository.deleteRule(id);

    await this.eventQueue.publish({
      event: AiGuardrailEvent.RULE_DELETED,
      workspaceId: existing.workspaceId ?? 'global',
      ruleId: id,
    });
  }

  async findRuleById(id: string): Promise<IAiGuardrailRule> {
    const rule = await this.repository.findRuleById(id);
    if (!rule) {
      throw new AiGuardrailRuleNotFoundException(id);
    }
    return rule;
  }

  async findAllRules(
    filter: GuardrailRuleFilterDto,
  ): Promise<PaginatedGuardrailRuleResponseDto> {
    const [data, total] = await this.repository.findAllRules(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRuleVersions(id: string): Promise<IAiGuardrailRuleVersion[]> {
    await this.findRuleById(id);
    return this.repository.findRuleVersions(id);
  }

  // ── Overrides ────────────────────────────────────────────────────

  async createOverride(
    dto: CreateGuardrailOverrideDto,
  ): Promise<IAiGuardrailOverride> {
    const override = await this.repository.createOverride({
      scope: dto.scope,
      ruleId: dto.ruleId,
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      modelId: dto.modelId,
      enabledOverride: dto.enabledOverride,
      decisionOverride: dto.decisionOverride,
      severityOverride: dto.severityOverride,
      priority: dto.priority ?? 0,
      reason: dto.reason,
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.OVERRIDE_CREATED,
      workspaceId: override.workspaceId ?? 'global',
      overrideId: override.id,
    });

    return override;
  }

  async updateOverride(
    id: string,
    dto: UpdateGuardrailOverrideDto,
  ): Promise<IAiGuardrailOverride> {
    await this.findOverrideById(id);

    const updated = await this.repository.updateOverride(id, {
      enabledOverride: dto.enabledOverride,
      decisionOverride: dto.decisionOverride,
      severityOverride: dto.severityOverride,
      priority: dto.priority,
      reason: dto.reason,
      metadata: dto.metadata,
      updatedBy: dto.updatedBy,
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.OVERRIDE_UPDATED,
      workspaceId: updated.workspaceId ?? 'global',
      overrideId: updated.id,
    });

    return updated;
  }

  async deleteOverride(id: string): Promise<void> {
    const existing = await this.findOverrideById(id);
    await this.repository.deleteOverride(id);

    await this.eventQueue.publish({
      event: AiGuardrailEvent.OVERRIDE_DELETED,
      workspaceId: existing.workspaceId ?? 'global',
      overrideId: id,
    });
  }

  async findOverrideById(id: string): Promise<IAiGuardrailOverride> {
    const override = await this.repository.findOverrideById(id);
    if (!override) {
      throw new AiGuardrailOverrideNotFoundException(id);
    }
    return override;
  }

  async findAllOverrides(
    filter: GuardrailOverrideFilterDto,
  ): Promise<PaginatedGuardrailOverrideResponseDto> {
    const [data, total] = await this.repository.findAllOverrides(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Evaluations ──────────────────────────────────────────────────

  async findEvaluationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailEvaluation> {
    const evaluation = await this.repository.findEvaluationById(id, workspaceId);
    if (!evaluation) {
      throw new AiGuardrailEvaluationNotFoundException(id);
    }
    return evaluation;
  }

  async findAllEvaluations(
    filter: GuardrailEvaluationFilterDto,
  ): Promise<PaginatedGuardrailEvaluationResponseDto> {
    const [data, total] = await this.repository.findAllEvaluations(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getEvaluationResults(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailEvaluationResult[]> {
    await this.findEvaluationById(id, workspaceId);
    return this.repository.findEvaluationResults(id);
  }

  // ── Incidents ────────────────────────────────────────────────────

  async findIncidentById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailIncident> {
    const incident = await this.repository.findIncidentById(id, workspaceId);
    if (!incident) {
      throw new AiGuardrailIncidentNotFoundException(id);
    }
    return incident;
  }

  async findAllIncidents(
    filter: GuardrailIncidentFilterDto,
  ): Promise<PaginatedGuardrailIncidentResponseDto> {
    const [data, total] = await this.repository.findAllIncidents(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateIncident(
    id: string,
    workspaceId: string,
    dto: UpdateGuardrailIncidentDto,
  ): Promise<IAiGuardrailIncident> {
    const existing = await this.findIncidentById(id, workspaceId);

    const updated = await this.repository.updateIncident(id, {
      status: dto.status,
      assignedTo: dto.assignedTo,
      resolution: dto.resolution,
      resolvedAt:
        dto.status === GuardrailIncidentStatus.RESOLVED ||
        dto.status === GuardrailIncidentStatus.DISMISSED
          ? new Date()
          : undefined,
      resolvedBy:
        dto.status === GuardrailIncidentStatus.RESOLVED
          ? dto.performedBy
          : undefined,
    });

    await this.repository.createIncidentHistory({
      incidentId: id,
      workspaceId,
      action: 'STATUS_CHANGED',
      oldStatus: existing.status,
      newStatus: dto.status,
      details: dto.resolution,
      performedBy: dto.performedBy,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.INCIDENT_UPDATED,
      workspaceId,
      incidentId: id,
    });

    return updated;
  }

  async getIncidentHistory(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailIncidentHistory[]> {
    await this.findIncidentById(id, workspaceId);
    return this.repository.findIncidentHistory(id);
  }

  // ── Approvals ────────────────────────────────────────────────────

  async findApprovalById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailApproval> {
    const approval = await this.repository.findApprovalById(id, workspaceId);
    if (!approval) {
      throw new AiGuardrailApprovalNotFoundException(id);
    }
    return approval;
  }

  async findAllApprovals(
    filter: GuardrailApprovalFilterDto,
  ): Promise<PaginatedGuardrailApprovalResponseDto> {
    const [data, total] = await this.repository.findAllApprovals(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async decideApproval(
    id: string,
    workspaceId: string,
    dto: DecideGuardrailApprovalDto,
  ): Promise<IAiGuardrailApproval> {
    const existing = await this.findApprovalById(id, workspaceId);

    if (existing.status !== GuardrailApprovalStatus.PENDING) {
      throw new AiGuardrailApprovalAlreadyDecidedException(id, existing.status);
    }

    const updated = await this.repository.updateApproval(id, {
      status: dto.decision,
      decidedBy: dto.decidedBy,
      decidedAt: new Date(),
      reason: dto.reason,
    });

    await this.repository.createApprovalHistory({
      approvalId: id,
      workspaceId,
      action: 'DECIDED',
      oldStatus: GuardrailApprovalStatus.PENDING,
      newStatus: dto.decision,
      details: dto.reason,
      performedBy: dto.decidedBy,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiGuardrailEvent.APPROVAL_DECIDED,
      workspaceId,
      approvalId: id,
    });

    return updated;
  }

  async getApprovalHistory(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailApprovalHistory[]> {
    await this.findApprovalById(id, workspaceId);
    return this.repository.findApprovalHistory(id);
  }

  // ── Stats ────────────────────────────────────────────────────────

  async getGuardrailStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getGuardrailStats(workspaceId, startDate, endDate);
  }
}
