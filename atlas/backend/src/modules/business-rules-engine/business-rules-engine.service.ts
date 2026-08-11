import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { BusinessRulesEngineRepository } from './business-rules-engine.repository';
import { RuleCacheService } from './rule-cache.service';
import { RuleActionRegistryService } from './rule-action-registry.service';
import { BusinessRulesEngineEventQueue } from './jobs';
import {
  NotifyActionHandler,
  CreateTaskActionHandler,
  RequireApprovalActionHandler,
  EmitEventActionHandler,
} from './actions';
import { buildRuleScopeKey, buildVisibleRuleScopeKeys, ruleScopeSpecificity } from './scope-key.util';
import { evaluateConditionGroup } from './condition-evaluator.util';
import { validateRuleSyntax, detectCircularExecution } from './rule-validator.util';
import {
  CreateRuleDto,
  UpdateRuleDto,
  RuleFilterDto,
  RollbackRuleDto,
  SimulateRuleDto,
  RuleExecutionFilterDto,
  PaginatedRuleResponseDto,
  PaginatedRuleExecutionResponseDto,
} from './dto';
import {
  IRule,
  IRuleAction,
  IRuleConditionGroup,
  IRuleExecution,
  IRuleHistory,
  IRuleValidationIssue,
  IRuleEvaluationContext,
  IRuleEvaluationResult,
  IRuleMatchResult,
  IRuleActionExecutionResult,
  IRuleSimulationResult,
  RuleScope,
  RuleStatus,
  RuleTriggerType,
  RuleActionType,
  RuleExecutionStatus,
  RuleManagementEvent,
} from './interfaces';
import {
  BUSINESS_RULES_ENGINE_MODULE,
  SYSTEM_RULE_SCOPE_KEY,
  RULES_GLOBAL_SCOPE_ROLES,
  RULES_WORKSPACE_SCOPE_ROLES,
  RULE_ALLOWED_TRANSITIONS,
} from './constants';
import {
  RuleNotFoundException,
  RuleAlreadyExistsException,
  RuleIsSystemRuleException,
  RuleInvalidStateTransitionException,
  RuleInvalidDefinitionException,
  RuleCircularDependencyException,
  RuleAccessDeniedException,
  RuleExecutionNotFoundException,
} from './exceptions/business-rules-engine.exceptions';

interface IRuleTransitionOptions {
  event: RuleManagementEvent;
  reason: string;
  extraFields?: Partial<IRule>;
}

@Injectable()
export class BusinessRulesEngineService implements OnModuleInit {
  private readonly logger = new Logger(BusinessRulesEngineService.name);

  constructor(
    private readonly repository: BusinessRulesEngineRepository,
    private readonly cache: RuleCacheService,
    private readonly actionRegistry: RuleActionRegistryService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: BusinessRulesEngineEventQueue,
    private readonly notifyActionHandler: NotifyActionHandler,
    private readonly createTaskActionHandler: CreateTaskActionHandler,
    private readonly requireApprovalActionHandler: RequireApprovalActionHandler,
    private readonly emitEventActionHandler: EmitEventActionHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    this.actionRegistry.register(this.notifyActionHandler);
    this.actionRegistry.register(this.createTaskActionHandler);
    this.actionRegistry.register(this.requireApprovalActionHandler);
    this.actionRegistry.register(this.emitEventActionHandler);
  }

  // ── Rules ────────────────────────────────────────────────────────

  async createRule(workspaceId: string, userId: string, userRole: string, dto: CreateRuleDto): Promise<IRule> {
    const scope = dto.scope ?? RuleScope.WORKSPACE;
    this.assertScopeRole(scope, userRole);

    const scopeWorkspaceId = scope === RuleScope.WORKSPACE ? workspaceId : undefined;
    const scopeKey = buildRuleScopeKey({ scope, workspaceId: scopeWorkspaceId, organizationId: dto.organizationId });

    const existing = await this.repository.findByScopeKeyModuleAndKey(scopeKey, dto.module, dto.key);
    if (existing) {
      throw new RuleAlreadyExistsException(dto.key);
    }

    const conditions = dto.conditions as unknown as IRuleConditionGroup;
    const actions = dto.actions as unknown as IRuleAction[];
    this.assertValidSyntax({ triggerType: dto.triggerType, triggerRef: dto.triggerRef, conditions, actions });

    const rule = await this.repository.create({
      workspaceId: scopeWorkspaceId ?? null,
      organizationId: scope === RuleScope.ORGANIZATION ? dto.organizationId : null,
      scopeKey,
      scope,
      module: dto.module,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      triggerType: dto.triggerType,
      triggerRef: dto.triggerRef,
      conditions: conditions as any,
      actions: actions as any,
      priority: dto.priority ?? 0,
      executionOrder: dto.executionOrder ?? 0,
      stopOnMatch: dto.stopOnMatch ?? false,
      isSystem: false,
      scheduleIntervalMinutes: dto.scheduleIntervalMinutes,
      version: 1,
      status: RuleStatus.DRAFT,
      createdBy: userId,
    });

    await this.repository.createHistory({
      ruleId: rule.id,
      workspaceId: rule.workspaceId,
      toStatus: RuleStatus.DRAFT,
      version: 1,
      changeReason: 'Created',
      changedBy: userId,
      snapshot: rule as any,
    });

    this.cache.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'business-rules-engine.rule.created', AuditActionCategory.CREATE, rule.id);
    await this.publishEvent(RuleManagementEvent.RULE_CREATED, { workspaceId, ruleId: rule.id, actorId: userId });
    return rule;
  }

  async updateRule(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateRuleDto): Promise<IRule> {
    const rule = await this.getRuleOrThrow(id);
    this.assertCanManage(rule, workspaceId, userRole);

    const conditions = (dto.conditions as unknown as IRuleConditionGroup) ?? rule.conditions;
    const actions = (dto.actions as unknown as IRuleAction[]) ?? rule.actions;
    const triggerRef = dto.triggerRef ?? rule.triggerRef ?? undefined;
    this.assertValidSyntax({ triggerType: rule.triggerType, triggerRef, conditions, actions });

    const newVersion = rule.version + 1;
    const updated = await this.repository.update(id, {
      name: dto.name ?? rule.name,
      description: dto.description ?? rule.description,
      triggerRef,
      conditions: conditions as any,
      actions: actions as any,
      priority: dto.priority ?? rule.priority,
      executionOrder: dto.executionOrder ?? rule.executionOrder,
      stopOnMatch: dto.stopOnMatch ?? rule.stopOnMatch,
      scheduleIntervalMinutes: dto.scheduleIntervalMinutes ?? rule.scheduleIntervalMinutes,
      version: newVersion,
    });

    await this.repository.createHistory({
      ruleId: id,
      workspaceId: rule.workspaceId,
      fromStatus: rule.status,
      toStatus: rule.status,
      version: newVersion,
      changeReason: dto.changeReason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.cache.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'business-rules-engine.rule.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(RuleManagementEvent.RULE_UPDATED, { workspaceId, ruleId: id, actorId: userId });
    return updated;
  }

  async publishRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<IRule> {
    return this.transition(id, workspaceId, userId, userRole, RuleStatus.PUBLISHED, {
      event: RuleManagementEvent.RULE_PUBLISHED,
      reason: 'Published',
      extraFields: { publishedAt: new Date() },
    });
  }

  async enableRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<IRule> {
    return this.transition(id, workspaceId, userId, userRole, RuleStatus.PUBLISHED, {
      event: RuleManagementEvent.RULE_ENABLED,
      reason: 'Enabled',
    });
  }

  async disableRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<IRule> {
    return this.transition(id, workspaceId, userId, userRole, RuleStatus.DISABLED, {
      event: RuleManagementEvent.RULE_DISABLED,
      reason: 'Disabled',
    });
  }

  async archiveRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<IRule> {
    return this.transition(id, workspaceId, userId, userRole, RuleStatus.ARCHIVED, {
      event: RuleManagementEvent.RULE_ARCHIVED,
      reason: 'Archived',
      extraFields: { archivedAt: new Date() },
    });
  }

  async restoreRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<IRule> {
    return this.transition(id, workspaceId, userId, userRole, RuleStatus.DRAFT, {
      event: RuleManagementEvent.RULE_RESTORED,
      reason: 'Restored',
      extraFields: { archivedAt: null },
    });
  }

  async rollbackRule(id: string, workspaceId: string, userId: string, userRole: string, dto: RollbackRuleDto): Promise<IRule> {
    const rule = await this.getRuleOrThrow(id);
    this.assertCanManage(rule, workspaceId, userRole);

    const history = await this.repository.findHistoryById(dto.historyId);
    if (!history || history.ruleId !== id) {
      throw new RuleNotFoundException(dto.historyId);
    }

    const snapshot = history.snapshot as unknown as IRule;
    this.assertValidSyntax({
      triggerType: rule.triggerType,
      triggerRef: snapshot.triggerRef ?? undefined,
      conditions: snapshot.conditions,
      actions: snapshot.actions,
    });

    const newVersion = rule.version + 1;
    const updated = await this.repository.update(id, {
      name: snapshot.name,
      description: snapshot.description,
      triggerRef: snapshot.triggerRef,
      conditions: snapshot.conditions as any,
      actions: snapshot.actions as any,
      priority: snapshot.priority,
      executionOrder: snapshot.executionOrder,
      stopOnMatch: snapshot.stopOnMatch,
      scheduleIntervalMinutes: snapshot.scheduleIntervalMinutes,
      version: newVersion,
    });

    await this.repository.createHistory({
      ruleId: id,
      workspaceId: rule.workspaceId,
      fromStatus: rule.status,
      toStatus: rule.status,
      version: newVersion,
      changeReason: dto.changeReason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.cache.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'business-rules-engine.rule.rolled_back', AuditActionCategory.UPDATE, id);
    await this.publishEvent(RuleManagementEvent.RULE_ROLLED_BACK, { workspaceId, ruleId: id, actorId: userId });
    return updated;
  }

  async findAllRules(workspaceId: string, filter: RuleFilterDto): Promise<PaginatedRuleResponseDto> {
    const visibleScopeKeys = buildVisibleRuleScopeKeys(workspaceId);
    const [data, total] = await this.repository.findAll(visibleScopeKeys, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getRule(id: string): Promise<IRule> {
    return this.getRuleOrThrow(id);
  }

  async getRuleHistory(id: string): Promise<IRuleHistory[]> {
    await this.getRuleOrThrow(id);
    return this.repository.findHistory(id);
  }

  // ── Validation & simulation ──────────────────────────────────────

  /** Pure syntax validation of an as-yet-unsaved definition (conditions/actions/trigger shape) — no persistence, no circular-execution check. */
  validateDefinition(draft: Pick<CreateRuleDto, 'triggerType' | 'triggerRef' | 'conditions' | 'actions'>): IRuleValidationIssue[] {
    return validateRuleSyntax({
      triggerType: draft.triggerType,
      triggerRef: draft.triggerRef,
      conditions: draft.conditions as unknown as IRuleConditionGroup,
      actions: draft.actions as unknown as IRuleAction[],
    });
  }

  /** Full validation of a saved rule: syntax + circular-execution chain detection against every other EVENT-triggered rule visible to it. */
  async validateRule(id: string): Promise<IRuleValidationIssue[]> {
    const rule = await this.getRuleOrThrow(id);
    const visibleScopeKeys = this.visibleScopeKeysForRule(rule);

    const syntaxIssues = validateRuleSyntax(rule);
    const allEventRules = await this.repository.findAllEventTriggeredForValidation(visibleScopeKeys);
    const circularIssues = detectCircularExecution(rule, allEventRules);

    return [...syntaxIssues, ...circularIssues];
  }

  async simulateRule(id: string, dto: SimulateRuleDto): Promise<IRuleSimulationResult> {
    const rule = await this.getRuleOrThrow(id);
    const matched = evaluateConditionGroup(rule.conditions, dto.input);
    const validation = await this.validateRule(id);

    return {
      matched,
      matchedConditions: { result: matched },
      wouldExecuteActions: matched ? rule.actions : [],
      validation,
    };
  }

  // ── Evaluation (the trigger-agnostic entry point: API/EVENT/SCHEDULE/WORKFLOW callers all invoke this) ──

  async evaluate(context: IRuleEvaluationContext): Promise<IRuleEvaluationResult> {
    const visibleScopeKeys = buildVisibleRuleScopeKeys(context.workspaceId, context.organizationId);
    const cacheKey = this.cache.buildKey(visibleScopeKeys, context.module, context.triggerType, context.triggerRef);

    let candidates = this.cache.get(cacheKey);
    if (!candidates) {
      candidates = await this.repository.findMatchCandidates(visibleScopeKeys, context.module, context.triggerType, context.triggerRef);
      this.cache.set(cacheKey, candidates);
    }

    const sorted = [...candidates].sort((a, b) => {
      const specificityDiff = ruleScopeSpecificity(b.scope) - ruleScopeSpecificity(a.scope);
      if (specificityDiff !== 0) return specificityDiff;
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.executionOrder - b.executionOrder;
    });

    const results: IRuleMatchResult[] = [];
    let overallBlocked = false;
    let overallBlockReason: string | undefined;

    for (const rule of sorted) {
      if (overallBlocked) break;

      const matched = evaluateConditionGroup(rule.conditions, context.input);
      if (!matched) {
        results.push({ ruleId: rule.id, ruleKey: rule.key, ruleVersion: rule.version, matched: false, blocked: false, actionsExecuted: [] });
        continue;
      }

      if (context.idempotencyKey) {
        const existing = await this.repository.findExecutionByIdempotencyKey(rule.id, context.idempotencyKey);
        if (existing) {
          const wasBlocked = existing.status === RuleExecutionStatus.BLOCKED;
          results.push({
            ruleId: rule.id,
            ruleKey: rule.key,
            ruleVersion: rule.version,
            matched: true,
            blocked: wasBlocked,
            blockReason: wasBlocked ? 'Blocked (idempotent replay)' : undefined,
            actionsExecuted: (existing.actionsExecuted as IRuleActionExecutionResult[]) ?? [],
            executionId: existing.id,
            idempotentReplay: true,
          });
          if (wasBlocked) {
            overallBlocked = true;
            overallBlockReason = 'Blocked (idempotent replay)';
            break;
          }
          if (rule.stopOnMatch) break;
          continue;
        }
      }

      const startedAt = Date.now();
      const outcome = await this.executeRuleActions(rule, context);
      const durationMs = Date.now() - startedAt;

      const execution = await this.repository.createExecution({
        ruleId: rule.id,
        ruleVersion: rule.version,
        workspaceId: context.workspaceId,
        module: context.module,
        triggerType: context.triggerType,
        triggerRef: context.triggerRef,
        entityType: context.entityType,
        entityId: context.entityId,
        status: outcome.status,
        matched: true,
        input: context.input as any,
        actionsExecuted: outcome.actionsExecuted as any,
        idempotencyKey: context.idempotencyKey,
        durationMs,
        executedBy: context.userId,
      });

      await this.publishEvent(
        outcome.status === RuleExecutionStatus.FAILED ? RuleManagementEvent.RULE_EXECUTION_FAILED : RuleManagementEvent.RULE_EXECUTED,
        { workspaceId: context.workspaceId, ruleId: rule.id, executionId: execution.id, actorId: context.userId },
      );

      results.push({
        ruleId: rule.id,
        ruleKey: rule.key,
        ruleVersion: rule.version,
        matched: true,
        blocked: outcome.blocked,
        blockReason: outcome.blockReason,
        actionsExecuted: outcome.actionsExecuted,
        executionId: execution.id,
      });

      if (outcome.blocked) {
        overallBlocked = true;
        overallBlockReason = outcome.blockReason;
        break;
      }

      if (rule.stopOnMatch) {
        break;
      }
    }

    return {
      matched: results.some((r) => r.matched),
      blocked: overallBlocked,
      blockReason: overallBlockReason,
      results,
    };
  }

  async getExecutions(workspaceId: string, filter: RuleExecutionFilterDto): Promise<PaginatedRuleExecutionResponseDto> {
    const [data, total] = await this.repository.findExecutions(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getExecution(id: string): Promise<IRuleExecution> {
    const execution = await this.repository.findExecutionById(id);
    if (!execution) {
      throw new RuleExecutionNotFoundException(id);
    }
    return execution;
  }

  // ── Schedule processing (scheduler-callable; no active scheduler wired — mirrors Approval Workflow / Task Management's approach) ──

  async processDueScheduledRules(): Promise<{ processedCount: number }> {
    const due = await this.repository.findDueScheduledRules(new Date());
    let processedCount = 0;

    for (const rule of due) {
      if (!rule.workspaceId) {
        this.logger.warn(`Skipping scheduled rule '${rule.key}' — GLOBAL/ORGANIZATION-scoped schedules have no single workspace to evaluate against`);
        continue;
      }

      await this.evaluate({
        workspaceId: rule.workspaceId,
        module: rule.module,
        triggerType: RuleTriggerType.SCHEDULE,
        triggerRef: rule.triggerRef ?? undefined,
        input: {},
      });

      const nextRunAt = new Date(Date.now() + (rule.scheduleIntervalMinutes ?? 60) * 60_000);
      await this.repository.update(rule.id, { nextRunAt });
      processedCount += 1;
    }

    return { processedCount };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async executeRuleActions(
    rule: IRule,
    context: IRuleEvaluationContext,
  ): Promise<{ status: RuleExecutionStatus; blocked: boolean; blockReason?: string; actionsExecuted: IRuleActionExecutionResult[] }> {
    const actionsExecuted: IRuleActionExecutionResult[] = [];
    let blocked = false;
    let blockReason: string | undefined;
    let failed = false;

    for (const action of rule.actions) {
      if (action.type === RuleActionType.BLOCK_ACTION) {
        blocked = true;
        blockReason = (action.config?.reason as string) ?? `Blocked by rule '${rule.key}'`;
        actionsExecuted.push({ type: action.type, status: 'EXECUTED', result: { blocked: true, reason: blockReason } });
        break;
      }

      const handler = this.actionRegistry.get(action.type);
      if (!handler) {
        actionsExecuted.push({
          type: action.type,
          status: 'SKIPPED',
          error: `No handler registered for action type '${action.type}'`,
        });
        continue;
      }

      try {
        const result = await handler.execute({ rule, evaluation: context, action });
        actionsExecuted.push({ type: action.type, status: 'EXECUTED', result });
      } catch (error) {
        actionsExecuted.push({ type: action.type, status: 'FAILED', error: (error as Error).message });
        failed = true;
        break;
      }
    }

    const status = blocked ? RuleExecutionStatus.BLOCKED : failed ? RuleExecutionStatus.FAILED : RuleExecutionStatus.SUCCESS;
    return { status, blocked, blockReason, actionsExecuted };
  }

  private assertValidSyntax(draft: { triggerType: RuleTriggerType; triggerRef?: string; conditions: IRuleConditionGroup; actions: IRuleAction[] }): void {
    const issues = validateRuleSyntax(draft).filter((i) => i.severity === 'ERROR');
    if (issues.length > 0) {
      throw new RuleInvalidDefinitionException(issues.map((i) => i.message));
    }
  }

  private async assertPublishable(rule: IRule): Promise<void> {
    const issues = await this.validateRule(rule.id);
    const errors = issues.filter((i) => i.severity === 'ERROR');
    if (errors.length === 0) return;

    const circular = errors.find((e) => e.code === 'RULE_CIRCULAR_EXECUTION');
    if (circular) {
      throw new RuleCircularDependencyException(circular.message.replace('Circular execution chain detected: ', '').split(' -> '));
    }
    throw new RuleInvalidDefinitionException(errors.map((e) => e.message));
  }

  private visibleScopeKeysForRule(rule: IRule): string[] {
    if (rule.workspaceId) {
      return buildVisibleRuleScopeKeys(rule.workspaceId);
    }
    if (rule.organizationId) {
      return [SYSTEM_RULE_SCOPE_KEY, `ORG:${rule.organizationId}`];
    }
    return [SYSTEM_RULE_SCOPE_KEY];
  }

  private async getRuleOrThrow(id: string): Promise<IRule> {
    const rule = await this.repository.findById(id);
    if (!rule) {
      throw new RuleNotFoundException(id);
    }
    return rule;
  }

  private async transition(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: RuleStatus,
    options: IRuleTransitionOptions,
  ): Promise<IRule> {
    const rule = await this.getRuleOrThrow(id);
    this.assertCanManage(rule, workspaceId, userRole);

    if (!RULE_ALLOWED_TRANSITIONS[rule.status]?.includes(to)) {
      throw new RuleInvalidStateTransitionException(rule.status, to);
    }

    if (to === RuleStatus.PUBLISHED) {
      await this.assertPublishable(rule);
    }

    const extraFields: Partial<IRule> = { ...options.extraFields };
    if (to === RuleStatus.PUBLISHED && rule.triggerType === RuleTriggerType.SCHEDULE && rule.scheduleIntervalMinutes) {
      extraFields.nextRunAt = new Date(Date.now() + rule.scheduleIntervalMinutes * 60_000);
    }

    const updated = await this.repository.update(id, {
      status: to,
      ...extraFields,
    } as Partial<IRule>);

    await this.repository.createHistory({
      ruleId: id,
      workspaceId: rule.workspaceId,
      fromStatus: rule.status,
      toStatus: to,
      version: rule.version,
      changeReason: options.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    this.cache.invalidateAll();
    await this.recordAudit(workspaceId, userId, `business-rules-engine.rule.${options.reason.toLowerCase()}`, AuditActionCategory.UPDATE, id);
    await this.publishEvent(options.event, { workspaceId, ruleId: id, actorId: userId });
    return updated;
  }

  private assertScopeRole(scope: RuleScope, userRole: string): void {
    if (scope === RuleScope.GLOBAL || scope === RuleScope.ORGANIZATION) {
      if (!RULES_GLOBAL_SCOPE_ROLES.includes(userRole)) {
        throw new RuleAccessDeniedException();
      }
      return;
    }
    if (!RULES_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
      throw new RuleAccessDeniedException();
    }
  }

  private assertCanManage(rule: IRule, workspaceId: string, userRole: string): void {
    if (rule.isSystem) {
      throw new RuleIsSystemRuleException(rule.key);
    }
    if (rule.workspaceId && rule.workspaceId !== workspaceId) {
      throw new RuleNotFoundException(rule.key);
    }
    this.assertScopeRole(rule.scope, userRole);
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: BUSINESS_RULES_ENGINE_MODULE,
      entityType: 'Rule',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: RuleManagementEvent,
    opts: { workspaceId?: string; ruleId?: string; executionId?: string; actorId?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
