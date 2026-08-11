import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationType, NotificationPriority, NotificationTargetType } from '@modules/notifications/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ApprovalWorkflowRepository } from './approval-workflow.repository';
import { ApprovalEngineService } from './approval-engine.service';
import { ApprovalWorkflowEventQueue } from './jobs';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  WorkflowDefinitionFilterDto,
  StartApprovalRequestDto,
  DecideApprovalDto,
  DelegateApprovalDto,
  ReassignApprovalDto,
  ApprovalActionReasonDto,
  RequestFilterDto,
  PaginatedWorkflowDefinitionResponseDto,
  PaginatedApprovalRequestResponseDto,
} from './dto';
import {
  IApprovalWorkflowDefinition,
  IApprovalWorkflowDefinitionHistory,
  IApprovalRequest,
  IApprovalStepInstance,
  IApprovalAssignment,
  IApprovalDecision,
  ApprovalWorkflowStatus,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ApprovalAssignmentStatus,
  ApproverType,
  ApprovalDecisionAction,
  ApprovalWorkflowEvent,
} from './interfaces';
import {
  APPROVAL_WORKFLOW_MODULE,
  APPROVAL_WORKFLOW_ALLOWED_TRANSITIONS,
  APPROVAL_ADMIN_ROLES,
} from './constants';
import {
  ApprovalWorkflowNotFoundException,
  ApprovalWorkflowAlreadyExistsException,
  ApprovalWorkflowInvalidStateTransitionException,
  ApprovalWorkflowNotPublishedException,
  ApprovalWorkflowInvalidDefinitionException,
  ApprovalRequestNotFoundException,
  ApprovalRequestInvalidStateTransitionException,
  ApprovalStepNotFoundException,
  SelfApprovalNotAllowedException,
  UnauthorizedApproverException,
  ApprovalAssignmentNotFoundException,
} from './exceptions/approval-workflow.exceptions';

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  constructor(
    private readonly repository: ApprovalWorkflowRepository,
    private readonly engine: ApprovalEngineService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: ApprovalWorkflowEventQueue,
  ) {}

  // ── Workflow definitions ─────────────────────────────────────────

  async createDefinition(
    workspaceId: string,
    userId: string,
    dto: CreateWorkflowDefinitionDto,
  ): Promise<IApprovalWorkflowDefinition> {
    const existing = await this.repository.findDefinitionByKey(workspaceId, dto.key);
    if (existing) {
      throw new ApprovalWorkflowAlreadyExistsException(dto.key);
    }

    this.assertValidSteps(dto.steps);

    const definition = await this.repository.createDefinition({
      workspaceId,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      module: dto.module,
      entityType: dto.entityType,
      mode: dto.mode,
      steps: dto.steps as any,
      matchCriteria: (dto.matchCriteria as any) ?? null,
      slaHours: dto.slaHours,
      escalation: (dto.escalation as any) ?? null,
      version: 1,
      status: ApprovalWorkflowStatus.DRAFT,
      createdBy: userId,
    });

    await this.repository.createDefinitionHistory({
      definitionId: definition.id,
      workspaceId,
      toStatus: ApprovalWorkflowStatus.DRAFT,
      version: 1,
      changeReason: 'Created',
      changedBy: userId,
      snapshot: definition as any,
    });

    await this.recordAudit(workspaceId, userId, 'approval-workflow.definition.created', AuditActionCategory.CONFIGURATION, 'ApprovalWorkflowDefinition', definition.id);
    await this.publishEvent(ApprovalWorkflowEvent.DEFINITION_CREATED, { workspaceId, definitionId: definition.id, actorId: userId });
    return definition;
  }

  async updateDefinition(
    id: string,
    workspaceId: string,
    userId: string,
    dto: UpdateWorkflowDefinitionDto,
  ): Promise<IApprovalWorkflowDefinition> {
    const definition = await this.getDefinitionOrThrow(id, workspaceId);
    if (definition.status === ApprovalWorkflowStatus.ARCHIVED) {
      throw new ApprovalWorkflowInvalidStateTransitionException(definition.status, 'update (restore it first)');
    }

    if (dto.steps) {
      this.assertValidSteps(dto.steps);
    }

    const newVersion = definition.version + 1;
    const updated = await this.repository.updateDefinition(id, {
      name: dto.name,
      description: dto.description,
      steps: dto.steps as any,
      matchCriteria: dto.matchCriteria as any,
      slaHours: dto.slaHours,
      escalation: dto.escalation as any,
      version: newVersion,
    } as Partial<IApprovalWorkflowDefinition>);

    await this.repository.createDefinitionHistory({
      definitionId: id,
      workspaceId,
      fromStatus: definition.status,
      toStatus: updated.status,
      version: newVersion,
      changeReason: dto.changeReason ?? 'Updated',
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, 'approval-workflow.definition.updated', AuditActionCategory.UPDATE, 'ApprovalWorkflowDefinition', id);
    await this.publishEvent(ApprovalWorkflowEvent.DEFINITION_UPDATED, { workspaceId, definitionId: id, actorId: userId });
    return updated;
  }

  async publishDefinition(id: string, workspaceId: string, userId: string): Promise<IApprovalWorkflowDefinition> {
    return this.transitionDefinition(id, workspaceId, userId, ApprovalWorkflowStatus.PUBLISHED, {
      event: ApprovalWorkflowEvent.DEFINITION_PUBLISHED,
      reason: 'Published',
      extraFields: { publishedAt: new Date() },
    });
  }

  async pauseDefinition(id: string, workspaceId: string, userId: string): Promise<IApprovalWorkflowDefinition> {
    return this.transitionDefinition(id, workspaceId, userId, ApprovalWorkflowStatus.PAUSED, {
      event: ApprovalWorkflowEvent.DEFINITION_PAUSED,
      reason: 'Paused',
    });
  }

  async archiveDefinition(id: string, workspaceId: string, userId: string): Promise<IApprovalWorkflowDefinition> {
    return this.transitionDefinition(id, workspaceId, userId, ApprovalWorkflowStatus.ARCHIVED, {
      event: ApprovalWorkflowEvent.DEFINITION_ARCHIVED,
      reason: 'Archived',
    });
  }

  async restoreDefinition(id: string, workspaceId: string, userId: string): Promise<IApprovalWorkflowDefinition> {
    return this.transitionDefinition(id, workspaceId, userId, ApprovalWorkflowStatus.DRAFT, {
      event: ApprovalWorkflowEvent.DEFINITION_RESTORED,
      reason: 'Restored',
    });
  }

  async findDefinition(id: string, workspaceId: string): Promise<IApprovalWorkflowDefinition> {
    return this.getDefinitionOrThrow(id, workspaceId);
  }

  async findAllDefinitions(
    workspaceId: string,
    filter: WorkflowDefinitionFilterDto,
  ): Promise<PaginatedWorkflowDefinitionResponseDto> {
    const [data, total] = await this.repository.findAllDefinitions(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDefinitionHistory(id: string, workspaceId: string): Promise<IApprovalWorkflowDefinitionHistory[]> {
    await this.getDefinitionOrThrow(id, workspaceId);
    return this.repository.findDefinitionHistory(id);
  }

  // ── Requests: start ──────────────────────────────────────────────

  async startRequest(workspaceId: string, userId: string, dto: StartApprovalRequestDto): Promise<IApprovalRequest> {
    const definition = await this.repository.findDefinitionByKey(workspaceId, dto.definitionKey);
    if (!definition) {
      throw new ApprovalWorkflowNotFoundException(dto.definitionKey);
    }
    if (definition.status !== ApprovalWorkflowStatus.PUBLISHED) {
      throw new ApprovalWorkflowNotPublishedException(definition.key);
    }
    if (definition.entityType && definition.entityType !== dto.entityType) {
      throw new ApprovalWorkflowInvalidDefinitionException(
        `this workflow only applies to entityType '${definition.entityType}'`,
      );
    }

    let request = await this.repository.createRequest({
      workspaceId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      module: definition.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      requestedBy: userId,
      title: dto.title,
      amount: dto.amount,
      riskLevel: dto.riskLevel,
      currentStepIndex: 0,
      status: ApprovalRequestStatus.PENDING,
      metadata: dto.metadata ?? {},
      slaDueAt: definition.slaHours ? new Date(Date.now() + definition.slaHours * 3_600_000) : null,
    });

    const { stepInstances, allSkipped } = await this.engine.initializeSteps(workspaceId, request, definition);

    if (allSkipped) {
      request = await this.repository.updateRequest(request.id, {
        status: ApprovalRequestStatus.APPROVED,
        completedAt: new Date(),
      } as Partial<IApprovalRequest>);

      await this.recordAudit(workspaceId, userId, 'approval-workflow.request.auto_approved', AuditActionCategory.APPROVE, 'ApprovalRequest', request.id);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_APPROVED, {
        workspaceId,
        requestId: request.id,
        module: request.module,
        entityType: request.entityType,
        entityId: request.entityId,
        status: request.status,
        actorId: userId,
      });
      return request;
    }

    const firstActiveStep = stepInstances.find((s) => s.status === ApprovalStepStatus.IN_PROGRESS);
    request = await this.repository.updateRequest(request.id, {
      status: ApprovalRequestStatus.IN_PROGRESS,
      currentStepIndex: firstActiveStep?.stepIndex ?? 0,
    } as Partial<IApprovalRequest>);

    await this.recordAudit(workspaceId, userId, 'approval-workflow.request.created', AuditActionCategory.CREATE, 'ApprovalRequest', request.id);
    await this.publishEvent(ApprovalWorkflowEvent.REQUEST_CREATED, {
      workspaceId,
      requestId: request.id,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
      status: request.status,
      actorId: userId,
    });

    if (firstActiveStep) {
      await this.notifyStepApprovers(workspaceId, request, firstActiveStep);
    }
    return request;
  }

  // ── Requests: decisions ───────────────────────────────────────────

  async decide(
    requestId: string,
    stepInstanceId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: DecideApprovalDto,
  ): Promise<IApprovalRequest> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    const stepInstance = await this.getStepInstanceOrThrow(stepInstanceId, requestId);

    if (request.status !== ApprovalRequestStatus.IN_PROGRESS || stepInstance.status !== ApprovalStepStatus.IN_PROGRESS) {
      throw new ApprovalRequestInvalidStateTransitionException(request.status, dto.action);
    }
    if (request.requestedBy === userId) {
      throw new SelfApprovalNotAllowedException();
    }

    const assignments = await this.repository.listAssignmentsForStep(stepInstanceId);
    let myAssignment: IApprovalAssignment | undefined;
    for (const assignment of assignments) {
      if (assignment.status !== ApprovalAssignmentStatus.PENDING) {
        continue;
      }
      if (await this.isEligibleApprover(workspaceId, userId, userRole, assignment)) {
        myAssignment = assignment;
        break;
      }
    }
    if (!myAssignment) {
      throw new UnauthorizedApproverException();
    }

    await this.repository.updateAssignment(myAssignment.id, { status: ApprovalAssignmentStatus.ACTED });
    await this.repository.createDecision({
      requestId,
      stepInstanceId,
      workspaceId,
      decidedBy: userId,
      action: dto.action as ApprovalDecisionAction,
      comment: dto.comment,
    });

    if (dto.action === 'REJECT') {
      await this.repository.updateStepInstance(stepInstanceId, {
        status: ApprovalStepStatus.REJECTED,
        completedAt: new Date(),
      } as Partial<IApprovalStepInstance>);
      const updatedRequest = await this.repository.updateRequest(requestId, {
        status: ApprovalRequestStatus.REJECTED,
        completedAt: new Date(),
      } as Partial<IApprovalRequest>);

      await this.recordAudit(workspaceId, userId, 'approval-workflow.request.rejected', AuditActionCategory.REJECT, 'ApprovalRequest', requestId, dto.comment);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_REJECTED, {
        workspaceId,
        requestId,
        module: request.module,
        entityType: request.entityType,
        entityId: request.entityId,
        status: updatedRequest.status,
        actorId: userId,
      });
      await this.notifyRequester(workspaceId, updatedRequest, 'Your approval request was rejected', dto.comment);
      return updatedRequest;
    }

    if (dto.action === 'REQUEST_CHANGES') {
      await this.repository.updateStepInstance(stepInstanceId, {
        status: ApprovalStepStatus.CHANGES_REQUESTED,
      } as Partial<IApprovalStepInstance>);
      const updatedRequest = await this.repository.updateRequest(requestId, {
        status: ApprovalRequestStatus.CHANGES_REQUESTED,
      } as Partial<IApprovalRequest>);

      await this.recordAudit(workspaceId, userId, 'approval-workflow.request.changes_requested', AuditActionCategory.UPDATE, 'ApprovalRequest', requestId, dto.comment);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_CHANGES_REQUESTED, {
        workspaceId,
        requestId,
        module: request.module,
        entityType: request.entityType,
        entityId: request.entityId,
        status: updatedRequest.status,
        actorId: userId,
      });
      await this.notifyRequester(workspaceId, updatedRequest, 'Changes were requested on your approval request', dto.comment);
      return updatedRequest;
    }

    // APPROVE
    const receivedApprovals = stepInstance.receivedApprovals + 1;
    const stepSatisfied = receivedApprovals >= stepInstance.requiredApprovals;
    await this.repository.updateStepInstance(stepInstanceId, {
      receivedApprovals,
      status: stepSatisfied ? ApprovalStepStatus.APPROVED : ApprovalStepStatus.IN_PROGRESS,
      completedAt: stepSatisfied ? new Date() : null,
    } as Partial<IApprovalStepInstance>);

    await this.recordAudit(workspaceId, userId, 'approval-workflow.step.approved', AuditActionCategory.APPROVE, 'ApprovalStepInstance', stepInstanceId, dto.comment);

    if (!stepSatisfied) {
      return request;
    }

    const definition = await this.getDefinitionByIdOrThrow(request.definitionId);
    const allResolved = await this.engine.areAllStepsResolved(requestId);
    if (allResolved) {
      const finalRequest = await this.repository.updateRequest(requestId, {
        status: ApprovalRequestStatus.APPROVED,
        completedAt: new Date(),
      } as Partial<IApprovalRequest>);

      await this.recordAudit(workspaceId, userId, 'approval-workflow.request.approved', AuditActionCategory.APPROVE, 'ApprovalRequest', requestId);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_APPROVED, {
        workspaceId,
        requestId,
        module: request.module,
        entityType: request.entityType,
        entityId: request.entityId,
        status: finalRequest.status,
        actorId: userId,
      });
      await this.notifyRequester(workspaceId, finalRequest, 'Your approval request was approved');
      return finalRequest;
    }

    const nextStep = await this.engine.activateNextStep(workspaceId, definition, request);
    if (nextStep) {
      const advancedRequest = await this.repository.updateRequest(requestId, {
        currentStepIndex: nextStep.stepIndex,
      } as Partial<IApprovalRequest>);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_STEP_ACTIVATED, {
        workspaceId,
        requestId,
        stepInstanceId: nextStep.id,
        module: request.module,
        actorId: userId,
      });
      await this.notifyStepApprovers(workspaceId, advancedRequest, nextStep);
      return advancedRequest;
    }

    return request;
  }

  async resubmit(requestId: string, workspaceId: string, userId: string, dto: ApprovalActionReasonDto): Promise<IApprovalRequest> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    if (request.status !== ApprovalRequestStatus.CHANGES_REQUESTED) {
      throw new ApprovalRequestInvalidStateTransitionException(request.status, 'resubmit');
    }
    if (request.requestedBy !== userId) {
      // Resubmission is requester-only, by design — kept simple and unambiguous.
      throw new UnauthorizedApproverException();
    }

    const stepInstance = await this.repository.findStepInstanceByRequestAndIndex(requestId, request.currentStepIndex);
    if (!stepInstance) {
      throw new ApprovalStepNotFoundException(String(request.currentStepIndex));
    }

    await this.repository.updateStepInstance(stepInstance.id, {
      status: ApprovalStepStatus.IN_PROGRESS,
      completedAt: null,
    } as Partial<IApprovalStepInstance>);

    const assignments = await this.repository.listAssignmentsForStep(stepInstance.id);
    for (const assignment of assignments) {
      if (assignment.status !== ApprovalAssignmentStatus.PENDING) {
        await this.repository.updateAssignment(assignment.id, { status: ApprovalAssignmentStatus.PENDING });
      }
    }

    const updated = await this.repository.updateRequest(requestId, {
      status: ApprovalRequestStatus.IN_PROGRESS,
    } as Partial<IApprovalRequest>);

    await this.recordAudit(workspaceId, userId, 'approval-workflow.request.resubmitted', AuditActionCategory.UPDATE, 'ApprovalRequest', requestId, dto.reason);
    await this.publishEvent(ApprovalWorkflowEvent.REQUEST_RESUBMITTED, {
      workspaceId,
      requestId,
      module: request.module,
      status: updated.status,
      actorId: userId,
    });
    await this.notifyStepApprovers(workspaceId, updated, stepInstance);
    return updated;
  }

  // ── Delegate / reassign ───────────────────────────────────────────

  async delegate(
    requestId: string,
    stepInstanceId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: DelegateApprovalDto,
  ): Promise<IApprovalDecision> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    const stepInstance = await this.getStepInstanceOrThrow(stepInstanceId, requestId);
    if (stepInstance.status !== ApprovalStepStatus.IN_PROGRESS) {
      throw new ApprovalRequestInvalidStateTransitionException(stepInstance.status, 'delegate');
    }
    if (dto.toUserId === userId || dto.toUserId === request.requestedBy) {
      throw new SelfApprovalNotAllowedException();
    }

    const assignments = await this.repository.listAssignmentsForStep(stepInstanceId);
    let myAssignment: IApprovalAssignment | undefined;
    for (const assignment of assignments) {
      if (assignment.status !== ApprovalAssignmentStatus.PENDING) {
        continue;
      }
      if (await this.isEligibleApprover(workspaceId, userId, userRole, assignment)) {
        myAssignment = assignment;
        break;
      }
    }
    if (!myAssignment) {
      throw new UnauthorizedApproverException();
    }

    await this.repository.updateAssignment(myAssignment.id, {
      status: ApprovalAssignmentStatus.DELEGATED,
      delegatedToUserId: dto.toUserId,
    });
    await this.repository.createAssignment({
      stepInstanceId,
      requestId,
      workspaceId,
      approverType: ApproverType.USER,
      approverRef: dto.toUserId,
      status: ApprovalAssignmentStatus.PENDING,
    });

    const decision = await this.repository.createDecision({
      requestId,
      stepInstanceId,
      workspaceId,
      decidedBy: userId,
      action: ApprovalDecisionAction.DELEGATE,
      comment: dto.comment,
      delegatedToUserId: dto.toUserId,
    });

    await this.recordAudit(workspaceId, userId, 'approval-workflow.assignment.delegated', AuditActionCategory.UPDATE, 'ApprovalStepInstance', stepInstanceId);
    await this.publishEvent(ApprovalWorkflowEvent.ASSIGNMENT_DELEGATED, {
      workspaceId,
      requestId,
      stepInstanceId,
      actorId: userId,
      metadata: { toUserId: dto.toUserId },
    });
    await this.notifyUser(workspaceId, dto.toUserId, 'An approval was delegated to you', request.title);
    return decision;
  }

  async reassign(
    requestId: string,
    stepInstanceId: string,
    assignmentId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: ReassignApprovalDto,
  ): Promise<IApprovalDecision> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    await this.getStepInstanceOrThrow(stepInstanceId, requestId);
    await this.assertCanManageWorkspaceApprovals(workspaceId, userId, userRole);

    if (dto.toUserId === request.requestedBy) {
      throw new SelfApprovalNotAllowedException();
    }

    const assignment = await this.repository.findAssignmentById(assignmentId);
    if (!assignment || assignment.stepInstanceId !== stepInstanceId) {
      throw new ApprovalAssignmentNotFoundException(assignmentId);
    }

    await this.repository.updateAssignment(assignmentId, {
      approverRef: dto.toUserId,
      status: ApprovalAssignmentStatus.PENDING,
    });

    const decision = await this.repository.createDecision({
      requestId,
      stepInstanceId,
      workspaceId,
      decidedBy: userId,
      action: ApprovalDecisionAction.REASSIGN,
      comment: dto.comment,
      reassignedToUserId: dto.toUserId,
    });

    await this.recordAudit(workspaceId, userId, 'approval-workflow.assignment.reassigned', AuditActionCategory.UPDATE, 'ApprovalStepInstance', stepInstanceId);
    await this.publishEvent(ApprovalWorkflowEvent.ASSIGNMENT_REASSIGNED, {
      workspaceId,
      requestId,
      stepInstanceId,
      actorId: userId,
      metadata: { toUserId: dto.toUserId },
    });
    await this.notifyUser(workspaceId, dto.toUserId, 'An approval was reassigned to you', request.title);
    return decision;
  }

  // ── Cancel / recall (idempotent) ──────────────────────────────────

  async cancel(
    requestId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: ApprovalActionReasonDto,
  ): Promise<IApprovalRequest> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    if (request.status === ApprovalRequestStatus.CANCELLED) {
      return request;
    }
    if (this.isTerminal(request.status)) {
      throw new ApprovalRequestInvalidStateTransitionException(request.status, 'cancel');
    }
    if (request.requestedBy !== userId) {
      await this.assertCanManageWorkspaceApprovals(workspaceId, userId, userRole);
    }

    return this.terminateRequest(request, workspaceId, userId, ApprovalRequestStatus.CANCELLED, ApprovalDecisionAction.CANCEL, dto.reason, ApprovalWorkflowEvent.REQUEST_CANCELLED);
  }

  async recall(requestId: string, workspaceId: string, userId: string, dto: ApprovalActionReasonDto): Promise<IApprovalRequest> {
    const request = await this.getRequestOrThrow(requestId, workspaceId);
    if (request.status === ApprovalRequestStatus.RECALLED) {
      return request;
    }
    if (this.isTerminal(request.status)) {
      throw new ApprovalRequestInvalidStateTransitionException(request.status, 'recall');
    }
    if (request.requestedBy !== userId) {
      throw new UnauthorizedApproverException();
    }

    return this.terminateRequest(request, workspaceId, userId, ApprovalRequestStatus.RECALLED, ApprovalDecisionAction.RECALL, dto.reason, ApprovalWorkflowEvent.REQUEST_RECALLED);
  }

  // ── Reads ──────────────────────────────────────────────────────────

  async getRequest(id: string, workspaceId: string): Promise<IApprovalRequest> {
    return this.getRequestOrThrow(id, workspaceId);
  }

  async findAllRequests(
    workspaceId: string,
    userId: string,
    userRole: string,
    filter: RequestFilterDto,
  ): Promise<PaginatedApprovalRequestResponseDto> {
    let restrictToRequestIds: string[] | undefined;
    if (filter.assignedToMe) {
      restrictToRequestIds = await this.repository.findRequestIdsWithPendingAssignmentFor(workspaceId, userId, [
        userRole.toLowerCase(),
      ]);
    }

    const [data, total] = await this.repository.findAllRequests(workspaceId, filter, restrictToRequestIds);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getStepInstances(requestId: string, workspaceId: string): Promise<IApprovalStepInstance[]> {
    await this.getRequestOrThrow(requestId, workspaceId);
    return this.repository.listStepInstances(requestId);
  }

  async getAssignmentsForStep(requestId: string, stepInstanceId: string, workspaceId: string): Promise<IApprovalAssignment[]> {
    await this.getRequestOrThrow(requestId, workspaceId);
    await this.getStepInstanceOrThrow(stepInstanceId, requestId);
    return this.repository.listAssignmentsForStep(stepInstanceId);
  }

  async getDecisionHistory(requestId: string, workspaceId: string): Promise<IApprovalDecision[]> {
    await this.getRequestOrThrow(requestId, workspaceId);
    return this.repository.listDecisionsForRequest(requestId);
  }

  // ── SLA / escalation (scheduler-callable; no active scheduler wired — mirrors Document Management's approach) ──

  async processSlaAndEscalations(): Promise<{ expiredCount: number; escalatedCount: number }> {
    const now = new Date();

    const pastSla = await this.repository.findRequestsPastSla(now);
    for (const request of pastSla) {
      await this.repository.updateRequest(request.id, {
        status: ApprovalRequestStatus.EXPIRED,
        completedAt: now,
      } as Partial<IApprovalRequest>);
      await this.publishEvent(ApprovalWorkflowEvent.REQUEST_EXPIRED, {
        workspaceId: request.workspaceId,
        requestId: request.id,
        module: request.module,
        status: ApprovalRequestStatus.EXPIRED,
      });
    }

    const pastDueSteps = await this.repository.findStepsPastDue(now);
    for (const step of pastDueSteps) {
      await this.repository.updateStepInstance(step.id, { escalatedAt: now } as Partial<IApprovalStepInstance>);
      await this.publishEvent(ApprovalWorkflowEvent.STEP_ESCALATED, {
        workspaceId: step.workspaceId,
        requestId: step.requestId,
        stepInstanceId: step.id,
      });
    }

    return { expiredCount: pastSla.length, escalatedCount: pastDueSteps.length };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private assertValidSteps(steps: Array<{ stepOrder: number }>): void {
    const orders = steps.map((s) => s.stepOrder);
    if (new Set(orders).size !== orders.length) {
      throw new ApprovalWorkflowInvalidDefinitionException('step stepOrder values must be unique');
    }
  }

  private isTerminal(status: ApprovalRequestStatus): boolean {
    return [
      ApprovalRequestStatus.APPROVED,
      ApprovalRequestStatus.REJECTED,
      ApprovalRequestStatus.CANCELLED,
      ApprovalRequestStatus.RECALLED,
      ApprovalRequestStatus.EXPIRED,
    ].includes(status);
  }

  private async terminateRequest(
    request: IApprovalRequest,
    workspaceId: string,
    userId: string,
    status: ApprovalRequestStatus,
    action: ApprovalDecisionAction,
    reason: string | undefined,
    event: ApprovalWorkflowEvent,
  ): Promise<IApprovalRequest> {
    const steps = await this.repository.listStepInstances(request.id);
    for (const step of steps) {
      if (step.status === ApprovalStepStatus.PENDING || step.status === ApprovalStepStatus.IN_PROGRESS) {
        await this.repository.updateStepInstance(step.id, {
          status: ApprovalStepStatus.SKIPPED,
          completedAt: new Date(),
        } as Partial<IApprovalStepInstance>);
      }
    }

    const updated = await this.repository.updateRequest(request.id, {
      status,
      completedAt: new Date(),
    } as Partial<IApprovalRequest>);

    await this.repository.createDecision({
      requestId: request.id,
      workspaceId,
      decidedBy: userId,
      action,
      comment: reason,
    });

    await this.recordAudit(workspaceId, userId, `approval-workflow.request.${action.toLowerCase()}`, AuditActionCategory.UPDATE, 'ApprovalRequest', request.id, reason);
    await this.publishEvent(event, {
      workspaceId,
      requestId: request.id,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
      status: updated.status,
      actorId: userId,
    });
    return updated;
  }

  private async isEligibleApprover(
    workspaceId: string,
    userId: string,
    userRole: string,
    assignment: IApprovalAssignment,
  ): Promise<boolean> {
    if (assignment.approverType === ApproverType.USER) {
      return assignment.approverRef === userId;
    }
    if (assignment.approverType === ApproverType.ROLE) {
      if (userRole.toUpperCase() === assignment.approverRef.toUpperCase()) {
        return true;
      }
      return this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, assignment.approverRef);
    }
    // TEAM: no Team membership model exists in this codebase — a TEAM assignment only becomes
    // decidable once explicitly reassigned to a concrete user (see `reassign`), at which point
    // its approverRef holds that user's id directly, same as a USER assignment.
    return assignment.approverRef === userId;
  }

  private async assertCanManageWorkspaceApprovals(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (APPROVAL_ADMIN_ROLES.includes(userRole)) {
      return;
    }
    const hasAdminRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'admin');
    if (!hasAdminRole) {
      throw new UnauthorizedApproverException();
    }
  }

  private async transitionDefinition(
    id: string,
    workspaceId: string,
    userId: string,
    to: ApprovalWorkflowStatus,
    options: { event: ApprovalWorkflowEvent; reason: string; extraFields?: Partial<IApprovalWorkflowDefinition> },
  ): Promise<IApprovalWorkflowDefinition> {
    const definition = await this.getDefinitionOrThrow(id, workspaceId);
    if (!APPROVAL_WORKFLOW_ALLOWED_TRANSITIONS[definition.status]?.includes(to)) {
      throw new ApprovalWorkflowInvalidStateTransitionException(definition.status, to);
    }

    const updated = await this.repository.updateDefinition(id, {
      status: to,
      ...options.extraFields,
    } as Partial<IApprovalWorkflowDefinition>);

    await this.repository.createDefinitionHistory({
      definitionId: id,
      workspaceId,
      fromStatus: definition.status,
      toStatus: to,
      version: definition.version,
      changeReason: options.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, `approval-workflow.definition.${options.reason.toLowerCase()}`, AuditActionCategory.CONFIGURATION, 'ApprovalWorkflowDefinition', id);
    await this.publishEvent(options.event, { workspaceId, definitionId: id, actorId: userId });
    return updated;
  }

  private async getDefinitionOrThrow(id: string, workspaceId: string): Promise<IApprovalWorkflowDefinition> {
    const definition = await this.repository.findDefinitionById(id);
    if (!definition || definition.workspaceId !== workspaceId) {
      throw new ApprovalWorkflowNotFoundException(id);
    }
    return definition;
  }

  private async getDefinitionByIdOrThrow(id: string): Promise<IApprovalWorkflowDefinition> {
    const definition = await this.repository.findDefinitionById(id);
    if (!definition) {
      throw new ApprovalWorkflowNotFoundException(id);
    }
    return definition;
  }

  private async getRequestOrThrow(id: string, workspaceId: string): Promise<IApprovalRequest> {
    const request = await this.repository.findRequestById(id);
    if (!request || request.workspaceId !== workspaceId) {
      throw new ApprovalRequestNotFoundException(id);
    }
    return request;
  }

  private async getStepInstanceOrThrow(id: string, requestId: string): Promise<IApprovalStepInstance> {
    const step = await this.repository.findStepInstanceById(id);
    if (!step || step.requestId !== requestId) {
      throw new ApprovalStepNotFoundException(id);
    }
    return step;
  }

  private async notifyStepApprovers(workspaceId: string, request: IApprovalRequest, step: IApprovalStepInstance): Promise<void> {
    const assignments = await this.repository.listAssignmentsForStep(step.id);
    for (const assignment of assignments) {
      if (assignment.status !== ApprovalAssignmentStatus.PENDING) {
        continue;
      }
      try {
        if (assignment.approverType === ApproverType.ROLE) {
          const dto: CreateNotificationDto = {
            workspaceId,
            targetType: NotificationTargetType.ROLE,
            targetRole: assignment.approverRef.toUpperCase(),
            type: NotificationType.APPROVAL,
            priority: NotificationPriority.NORMAL,
            category: APPROVAL_WORKFLOW_MODULE,
            title: 'Approval needed',
            message: `"${request.title}" is awaiting your approval`,
            sourceModule: request.module,
            entityType: request.entityType,
            entityId: request.entityId,
            actionRequired: true,
          } as CreateNotificationDto;
          await this.notificationsService.create(dto);
        } else if (assignment.approverType === ApproverType.USER) {
          await this.notifyUser(workspaceId, assignment.approverRef, 'Approval needed', request.title);
        }
      } catch (error) {
        this.logger.warn(`Failed to notify approver for step ${step.id}: ${(error as Error).message}`);
      }
    }
  }

  private async notifyUser(workspaceId: string, userId: string, title: string, message: string): Promise<void> {
    try {
      const dto: CreateNotificationDto = {
        workspaceId,
        targetType: NotificationTargetType.USER,
        targetUserId: userId,
        type: NotificationType.APPROVAL,
        priority: NotificationPriority.NORMAL,
        category: APPROVAL_WORKFLOW_MODULE,
        title,
        message,
        actionRequired: true,
      } as CreateNotificationDto;
      await this.notificationsService.create(dto);
    } catch (error) {
      this.logger.warn(`Failed to notify user ${userId}: ${(error as Error).message}`);
    }
  }

  private async notifyRequester(
    workspaceId: string,
    request: IApprovalRequest,
    title: string,
    comment?: string,
  ): Promise<void> {
    if (!request.requestedBy) {
      return;
    }
    await this.notifyUser(workspaceId, request.requestedBy, title, comment ?? request.title);
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityType: string,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: APPROVAL_WORKFLOW_MODULE,
      entityType,
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      reason,
    });
  }

  private async publishEvent(
    event: ApprovalWorkflowEvent,
    opts: {
      workspaceId: string;
      definitionId?: string;
      requestId?: string;
      stepInstanceId?: string;
      module?: string;
      entityType?: string;
      entityId?: string;
      status?: ApprovalRequestStatus;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
