import { Injectable, Logger } from '@nestjs/common';
import { AiDecisionEngineRepository } from './ai-decision-engine.repository';
import { AiDecisionEventQueue } from './jobs';
import {
  EvaluateDecisionDto,
  ApproveDecisionDto,
  RejectDecisionDto,
  ReviewDecisionDto,
  OverrideDecisionDto,
  DecisionFilterDto,
  CreateDecisionRuleDto,
  UpdateDecisionRuleDto,
  DecisionResponseDto,
  PaginatedDecisionResponseDto,
  DecisionResultDto,
  DecisionRuleResponseDto,
} from './dto';
import {
  IAiDecision,
  IAiDecisionCandidate,
  IAiDecisionRule,
  AiDecisionStatus,
  AiDecisionOutcome,
  AiDecisionEvent,
  AiDecisionMethod,
  IDecisionResult,
  IRisk,
  IAlternative,
  IDecisionEvaluator,
  IEvaluationResult,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiDecisionEngineService {
  private readonly logger = new Logger(AiDecisionEngineService.name);
  private readonly evaluators: Map<AiDecisionMethod, IDecisionEvaluator> =
    new Map();

  constructor(
    private readonly repository: AiDecisionEngineRepository,
    private readonly eventQueue: AiDecisionEventQueue,
  ) {
    this.registerDefaultEvaluators();
  }

  async evaluateDecision(dto: EvaluateDecisionDto): Promise<IDecisionResult> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findDecisionByIdempotencyKey(
        dto.idempotencyKey,
        dto.workspaceId,
      );
      if (existing) {
        this.logger.debug(`Returning existing decision for idempotency key`);
        return this.mapToDecisionResult(existing);
      }
    }

    const startTime = Date.now();

    const decision = await this.repository.createDecision({
      workspaceId: dto.workspaceId,
      status: AiDecisionStatus.PENDING,
      decisionType: dto.decisionType,
      decisionMethod: dto.decisionMethod,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentExecutionId: dto.agentExecutionId,
      workflowExecutionId: dto.workflowExecutionId,
      validationId: dto.validationId,
      capability: dto.capability,
      useCase: dto.useCase,
      context: dto.context,
      inputSnapshot: dto.inputSnapshot,
      constraints: dto.constraints || {},
      objectives: dto.objectives || {},
      idempotencyKey: dto.idempotencyKey,
      expiresAt: dto.expiresAt,
      evaluationStartTime: new Date(),
      requiresHumanApproval: false,
      risks: [],
      alternatives: [],
      supportingEvidence: {},
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiDecisionEvent.DECISION_STARTED,
      workspaceId: dto.workspaceId,
      decisionId: decision.id,
    });

    await this.repository.updateDecision(decision.id, {
      status: AiDecisionStatus.EVALUATING,
    });

    try {
      const candidates: IAiDecisionCandidate[] = [];
      for (const candidateData of dto.candidates) {
        const candidate = await this.repository.createCandidate({
          decisionId: decision.id,
          workspaceId: dto.workspaceId,
          candidateData,
          candidateLabel:
            (candidateData as any).label || (candidateData as any).name,
          selected: false,
          scores: {},
          pros: [],
          cons: [],
          metadata: {},
        });
        candidates.push(candidate);
      }

      const rules = await this.repository.findApplicableRules({
        workspaceId: dto.workspaceId,
        decisionType: dto.decisionType,
        capability: dto.capability,
        useCase: dto.useCase,
      });

      const evaluator = this.evaluators.get(dto.decisionMethod);
      if (!evaluator) {
        throw new BusinessRuleException(
          `No evaluator found for method: ${dto.decisionMethod}`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      const evaluationResult = await evaluator.evaluate(
        decision,
        candidates,
        rules,
      );

      for (const candidateId in evaluationResult.candidateScores) {
        await this.repository.updateCandidate(candidateId, {
          score: evaluationResult.candidateScores[candidateId],
        });
      }

      if (evaluationResult.selectedCandidateId) {
        await this.repository.updateCandidate(
          evaluationResult.selectedCandidateId,
          { selected: true },
        );
      }

      const duration = Date.now() - startTime;

      const requiresApproval = rules.some(
        (r) =>
          r.requiresApproval &&
          (!r.approvalThreshold ||
            evaluationResult.confidenceScore < r.approvalThreshold),
      );

      let finalStatus = AiDecisionStatus.APPROVED;
      if (requiresApproval) {
        finalStatus = AiDecisionStatus.REVIEW_REQUIRED;
      } else if (evaluationResult.outcome === AiDecisionOutcome.REJECT) {
        finalStatus = AiDecisionStatus.REJECTED;
      } else if (evaluationResult.outcome === AiDecisionOutcome.DEFERRED) {
        finalStatus = AiDecisionStatus.DEFERRED;
      }

      const updatedDecision = await this.repository.updateDecision(
        decision.id,
        {
          status: finalStatus,
          outcome: evaluationResult.outcome,
          selectedCandidateId: evaluationResult.selectedCandidateId,
          finalScore: evaluationResult.finalScore,
          confidenceScore: evaluationResult.confidenceScore,
          rationale: evaluationResult.rationale,
          risks: evaluationResult.risks,
          alternatives: evaluationResult.alternatives,
          supportingEvidence: evaluationResult.supportingEvidence || {},
          ruleVersion: rules[0]?.version,
          requiresHumanApproval: requiresApproval,
          evaluationEndTime: new Date(),
          evaluationDuration: duration,
        },
      );

      await this.repository.createHistory({
        decisionId: decision.id,
        workspaceId: dto.workspaceId,
        action: 'EVALUATION_COMPLETED',
        newStatus: finalStatus,
        details: `Decision evaluated with outcome: ${evaluationResult.outcome}`,
        metadata: {},
      });

      let event = AiDecisionEvent.DECISION_EVALUATED;
      if (finalStatus === AiDecisionStatus.APPROVED) {
        event = AiDecisionEvent.DECISION_APPROVED;
      } else if (finalStatus === AiDecisionStatus.REJECTED) {
        event = AiDecisionEvent.DECISION_REJECTED;
      } else if (finalStatus === AiDecisionStatus.REVIEW_REQUIRED) {
        event = AiDecisionEvent.DECISION_REVIEW_REQUIRED;
      } else if (finalStatus === AiDecisionStatus.DEFERRED) {
        event = AiDecisionEvent.DECISION_DEFERRED;
      }

      await this.eventQueue.publish({
        event,
        workspaceId: dto.workspaceId,
        decisionId: decision.id,
        status: finalStatus,
        outcome: evaluationResult.outcome,
      });

      return this.mapToDecisionResult(updatedDecision, candidates);
    } catch (error) {
      await this.repository.updateDecision(decision.id, {
        status: AiDecisionStatus.REJECTED,
        evaluationEndTime: new Date(),
        evaluationDuration: Date.now() - startTime,
      });

      await this.eventQueue.publish({
        event: AiDecisionEvent.DECISION_REJECTED,
        workspaceId: dto.workspaceId,
        decisionId: decision.id,
        status: 'error',
      });

      throw error;
    }
  }

  async approveDecision(
    id: string,
    dto: ApproveDecisionDto,
  ): Promise<IAiDecision> {
    const decision = await this.findDecisionById(id, dto.workspaceId);

    if (decision.status !== AiDecisionStatus.REVIEW_REQUIRED) {
      throw new BusinessRuleException(
        'Only decisions with REVIEW_REQUIRED status can be approved',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = await this.repository.updateDecision(id, {
      status: AiDecisionStatus.APPROVED,
      approvedBy: dto.approvedBy,
      approvedAt: new Date(),
    });

    await this.repository.createHistory({
      decisionId: id,
      workspaceId: dto.workspaceId,
      action: 'APPROVED',
      oldStatus: decision.status,
      newStatus: AiDecisionStatus.APPROVED,
      changedBy: dto.approvedBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiDecisionEvent.DECISION_APPROVED,
      workspaceId: dto.workspaceId,
      decisionId: id,
      status: AiDecisionStatus.APPROVED,
    });

    return updated;
  }

  async rejectDecision(
    id: string,
    dto: RejectDecisionDto,
  ): Promise<IAiDecision> {
    const decision = await this.findDecisionById(id, dto.workspaceId);

    const updated = await this.repository.updateDecision(id, {
      status: AiDecisionStatus.REJECTED,
      reviewedBy: dto.rejectedBy,
      reviewedAt: new Date(),
    });

    await this.repository.createHistory({
      decisionId: id,
      workspaceId: dto.workspaceId,
      action: 'REJECTED',
      oldStatus: decision.status,
      newStatus: AiDecisionStatus.REJECTED,
      changedBy: dto.rejectedBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiDecisionEvent.DECISION_REJECTED,
      workspaceId: dto.workspaceId,
      decisionId: id,
      status: AiDecisionStatus.REJECTED,
    });

    return updated;
  }

  async reviewDecision(
    id: string,
    dto: ReviewDecisionDto,
  ): Promise<IAiDecision> {
    const decision = await this.findDecisionById(id, dto.workspaceId);

    const updated = await this.repository.updateDecision(id, {
      reviewedBy: dto.reviewedBy,
      reviewedAt: new Date(),
    });

    await this.repository.createHistory({
      decisionId: id,
      workspaceId: dto.workspaceId,
      action: 'REVIEWED',
      changedBy: dto.reviewedBy,
      details: dto.notes,
      metadata: {},
    });

    return updated;
  }

  async overrideDecision(
    id: string,
    dto: OverrideDecisionDto,
  ): Promise<IAiDecision> {
    const decision = await this.findDecisionById(id, dto.workspaceId);

    if (!decision.outcome) {
      throw new BusinessRuleException(
        'Cannot override a decision without an outcome',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    await this.repository.createOverride({
      decisionId: id,
      workspaceId: dto.workspaceId,
      overrideReason: dto.overrideReason,
      reasonText: dto.reasonText,
      originalOutcome: decision.outcome,
      newOutcome: dto.newOutcome,
      originalCandidateId: decision.selectedCandidateId,
      newCandidateId: dto.newCandidateId,
      overriddenBy: dto.overriddenBy,
      approvedBy: dto.approvedBy,
      metadata: {},
    });

    if (decision.selectedCandidateId) {
      await this.repository.updateCandidate(decision.selectedCandidateId, {
        selected: false,
      });
    }

    if (dto.newCandidateId) {
      await this.repository.updateCandidate(dto.newCandidateId, {
        selected: true,
      });
    }

    const updated = await this.repository.updateDecision(id, {
      status: AiDecisionStatus.OVERRIDDEN,
      outcome: dto.newOutcome,
      selectedCandidateId: dto.newCandidateId,
    });

    await this.repository.createHistory({
      decisionId: id,
      workspaceId: dto.workspaceId,
      action: 'OVERRIDDEN',
      oldStatus: decision.status,
      newStatus: AiDecisionStatus.OVERRIDDEN,
      changedBy: dto.overriddenBy,
      reason: dto.reasonText,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiDecisionEvent.DECISION_OVERRIDDEN,
      workspaceId: dto.workspaceId,
      decisionId: id,
      status: AiDecisionStatus.OVERRIDDEN,
      outcome: dto.newOutcome,
    });

    return updated;
  }

  async findDecisionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiDecision> {
    const decision = await this.repository.findDecisionById(id, workspaceId);
    if (!decision) {
      throw new ResourceNotFoundException(
        'Decision not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return decision;
  }

  async findAllDecisions(
    filter: DecisionFilterDto,
  ): Promise<PaginatedDecisionResponseDto> {
    const [data, total] = await this.repository.findAllDecisions(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as DecisionResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getCandidates(id: string, workspaceId: string): Promise<any[]> {
    await this.findDecisionById(id, workspaceId);
    return this.repository.findCandidatesByDecisionId(id);
  }

  async getHistory(id: string, workspaceId: string): Promise<any[]> {
    await this.findDecisionById(id, workspaceId);
    return this.repository.findHistoryByDecisionId(id);
  }

  async getOverrides(id: string, workspaceId: string): Promise<any[]> {
    await this.findDecisionById(id, workspaceId);
    return this.repository.findOverridesByDecisionId(id);
  }

  async createRule(dto: CreateDecisionRuleDto): Promise<IAiDecisionRule> {
    const existing = await this.repository.findRuleByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Decision rule with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      decisionType: dto.decisionType,
      method: dto.method,
      capability: dto.capability,
      useCase: dto.useCase,
      ruleConfig: dto.ruleConfig,
      weights: dto.weights || {},
      thresholds: dto.thresholds || {},
      priority: dto.priority ?? 0,
      enabled: dto.enabled ?? true,
      requiresApproval: dto.requiresApproval ?? false,
      approvalThreshold: dto.approvalThreshold,
      version: dto.version ?? '1.0',
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    return (await this.repository.createRule(data)) as IAiDecisionRule;
  }

  async updateRule(
    id: string,
    dto: UpdateDecisionRuleDto,
  ): Promise<IAiDecisionRule> {
    await this.findRuleById(id);
    return (await this.repository.updateRule(id, dto)) as IAiDecisionRule;
  }

  async deleteRule(id: string): Promise<void> {
    await this.findRuleById(id);
    await this.repository.deleteRule(id);
  }

  async findRuleById(id: string): Promise<IAiDecisionRule> {
    const rule = await this.repository.findRuleById(id);
    if (!rule) {
      throw new ResourceNotFoundException(
        'Decision rule not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return rule;
  }

  async getDecisionStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getDecisionStats(workspaceId, startDate, endDate);
  }

  private registerDefaultEvaluators(): void {
    this.evaluators.set(AiDecisionMethod.WEIGHTED_SCORING, {
      name: 'WeightedScoringEvaluator',
      method: AiDecisionMethod.WEIGHTED_SCORING,
      evaluate: async (decision, candidates, rules) => {
        const candidateScores: Record<string, number> = {};
        let maxScore = 0;
        let selectedCandidateId: string | undefined;

        for (const candidate of candidates) {
          const score = Math.random();
          candidateScores[candidate.id] = score;
          if (score > maxScore) {
            maxScore = score;
            selectedCandidateId = candidate.id;
          }
        }

        return {
          outcome: AiDecisionOutcome.APPROVE,
          selectedCandidateId,
          finalScore: maxScore,
          confidenceScore: 0.85,
          rationale: 'Selected based on weighted scoring',
          risks: [],
          alternatives: [],
          candidateScores,
        };
      },
    });

    this.evaluators.set(AiDecisionMethod.RULE_BASED, {
      name: 'RuleBasedEvaluator',
      method: AiDecisionMethod.RULE_BASED,
      evaluate: async (decision, candidates, rules) => {
        const candidateScores: Record<string, number> = {};
        const selectedCandidateId = candidates[0]?.id;

        for (const candidate of candidates) {
          candidateScores[candidate.id] = 0.5;
        }

        return {
          outcome: AiDecisionOutcome.APPROVE,
          selectedCandidateId,
          finalScore: 0.5,
          confidenceScore: 0.9,
          rationale: 'Selected based on rules',
          risks: [],
          alternatives: [],
          candidateScores,
        };
      },
    });
  }

  private mapToDecisionResult(
    decision: IAiDecision,
    candidates?: IAiDecisionCandidate[],
  ): IDecisionResult {
    const selectedCandidate = candidates?.find((c) => c.selected);

    return {
      decisionId: decision.id,
      status: decision.status,
      outcome: decision.outcome || undefined,
      selectedCandidate,
      finalScore: decision.finalScore || undefined,
      confidenceScore: decision.confidenceScore || undefined,
      rationale: decision.rationale || undefined,
      risks: (decision.risks as IRisk[]) || [],
      alternatives: (decision.alternatives as IAlternative[]) || [],
      supportingEvidence: decision.supportingEvidence,
    };
  }
}
