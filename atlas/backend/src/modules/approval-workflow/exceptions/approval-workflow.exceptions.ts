import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class ApprovalWorkflowNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Approval workflow definition '${idOrKey}' not found`,
      errorCode: ErrorCode.APPROVAL_WORKFLOW_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ApprovalWorkflowAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Approval workflow definition '${key}' already exists in this workspace`,
      errorCode: ErrorCode.APPROVAL_WORKFLOW_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ApprovalWorkflowInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition approval workflow definition from '${from}' to '${to}'`,
      errorCode: ErrorCode.APPROVAL_WORKFLOW_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ApprovalWorkflowNotPublishedException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Approval workflow definition '${key}' is not published`,
      errorCode: ErrorCode.APPROVAL_WORKFLOW_NOT_PUBLISHED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ApprovalWorkflowInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid workflow definition: ${reason}`,
      errorCode: ErrorCode.APPROVAL_WORKFLOW_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ApprovalRequestNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Approval request '${id}' not found`,
      errorCode: ErrorCode.APPROVAL_REQUEST_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ApprovalRequestInvalidStateTransitionException extends AtlasException {
  constructor(from: string, action: string) {
    super({
      message: `Cannot perform '${action}' on an approval request in status '${from}'`,
      errorCode: ErrorCode.APPROVAL_REQUEST_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ApprovalStepNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Approval step '${id}' not found on this request`,
      errorCode: ErrorCode.APPROVAL_STEP_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SelfApprovalNotAllowedException extends AtlasException {
  constructor() {
    super({
      message: 'You cannot approve, reject or decide on a request you submitted yourself',
      errorCode: ErrorCode.APPROVAL_SELF_APPROVAL_NOT_ALLOWED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class UnauthorizedApproverException extends AtlasException {
  constructor() {
    super({
      message: 'You are not an eligible approver for this step',
      errorCode: ErrorCode.APPROVAL_UNAUTHORIZED_APPROVER,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ApprovalAssignmentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Approval assignment '${id}' not found`,
      errorCode: ErrorCode.APPROVAL_ASSIGNMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class CircularDelegationException extends AtlasException {
  constructor(toUserId: string) {
    super({
      message: `Cannot delegate to '${toUserId}' — this would create a circular delegation chain back to an existing approver on this step`,
      errorCode: ErrorCode.APPROVAL_CIRCULAR_DELEGATION,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PrivilegeEscalationDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You cannot delegate, reassign or override an approval to a user with a higher effective permission level than your own',
      errorCode: ErrorCode.APPROVAL_PRIVILEGE_ESCALATION_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ManualOverrideDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'Manual override requires explicit override permission and a reason',
      errorCode: ErrorCode.APPROVAL_OVERRIDE_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ApprovalSubstituteNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Approval substitute '${id}' not found`,
      errorCode: ErrorCode.APPROVAL_SUBSTITUTE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ApprovalTemplateNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Approval workflow template '${key}' not found`,
      errorCode: ErrorCode.APPROVAL_TEMPLATE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
