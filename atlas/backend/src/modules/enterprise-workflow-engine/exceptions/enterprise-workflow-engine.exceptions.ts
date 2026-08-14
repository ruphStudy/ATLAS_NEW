import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class WorkflowDefinitionNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Workflow definition '${idOrKey}' not found`,
      errorCode: ErrorCode.WORKFLOW_DEFINITION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WorkflowDefinitionAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Workflow definition '${key}' already exists in this scope`,
      errorCode: ErrorCode.WORKFLOW_DEFINITION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WorkflowDefinitionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition workflow definition from '${from}' to '${to}'`,
      errorCode: ErrorCode.WORKFLOW_DEFINITION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkflowDefinitionInvalidException extends AtlasException {
  constructor(errors: string[]) {
    super({
      message: 'Workflow definition validation failed',
      errorCode: ErrorCode.WORKFLOW_DEFINITION_INVALID,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    });
  }
}

export class WorkflowDefinitionNotPublishedException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Workflow definition '${idOrKey}' is not published`,
      errorCode: ErrorCode.WORKFLOW_DEFINITION_NOT_PUBLISHED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkflowStepExecutorNotRegisteredException extends AtlasException {
  constructor(stepType: string) {
    super({
      message: `No step executor is registered for step type '${stepType}'`,
      errorCode: ErrorCode.WORKFLOW_STEP_EXECUTOR_NOT_REGISTERED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class WorkflowExecutionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Workflow execution '${id}' not found`,
      errorCode: ErrorCode.WORKFLOW_EXECUTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WorkflowExecutionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition workflow execution from '${from}' to '${to}'`,
      errorCode: ErrorCode.WORKFLOW_EXECUTION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkflowExecutionDuplicateException extends AtlasException {
  constructor(idempotencyKey: string) {
    super({
      message: `An execution with idempotency key '${idempotencyKey}' already exists for this workflow`,
      errorCode: ErrorCode.WORKFLOW_EXECUTION_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WorkflowStepExecutionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Workflow step execution '${id}' not found`,
      errorCode: ErrorCode.WORKFLOW_STEP_EXECUTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WorkflowStepNotWaitingException extends AtlasException {
  constructor(id: string, status: string) {
    super({
      message: `Workflow step execution '${id}' is not waiting for external input (current status: '${status}')`,
      errorCode: ErrorCode.WORKFLOW_STEP_NOT_WAITING,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WorkflowAccessDeniedException extends AtlasException {
  constructor(action: string) {
    super({
      message: `You do not have permission to ${action} this workflow`,
      errorCode: ErrorCode.WORKFLOW_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
