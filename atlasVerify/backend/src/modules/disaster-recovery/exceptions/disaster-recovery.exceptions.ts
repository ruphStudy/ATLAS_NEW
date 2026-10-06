import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class DrPolicyNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Disaster recovery policy '${idOrKey}' not found`,
      errorCode: ErrorCode.DR_POLICY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class DrPolicyAlreadyExistsException extends AtlasException {
  constructor(criticalService: string) {
    super({
      message: `A disaster recovery policy already exists for critical service '${criticalService}' in this scope`,
      errorCode: ErrorCode.DR_POLICY_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class DrPolicyInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition disaster recovery policy from '${from}' to '${to}'`,
      errorCode: ErrorCode.DR_POLICY_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class DrPlanNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Disaster recovery plan '${idOrKey}' not found`,
      errorCode: ErrorCode.DR_PLAN_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class DrPlanAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Disaster recovery plan '${key}' already exists in this scope`,
      errorCode: ErrorCode.DR_PLAN_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class DrPlanNotPublishedException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Disaster recovery plan '${key}' is not published`,
      errorCode: ErrorCode.DR_PLAN_NOT_PUBLISHED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class DrPlanInvalidDefinitionException extends AtlasException {
  constructor(errors: string[]) {
    super({
      message: 'Disaster recovery plan validation failed',
      errorCode: ErrorCode.DR_PLAN_INVALID_DEFINITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    });
  }
}

export class DrExecutionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Disaster recovery execution '${id}' not found`,
      errorCode: ErrorCode.DR_EXECUTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class DrExecutionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition disaster recovery execution from '${from}' to '${to}'`,
      errorCode: ErrorCode.DR_EXECUTION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class DrExecutionDuplicateException extends AtlasException {
  constructor(idempotencyKey: string) {
    super({
      message: `A recovery execution with idempotency key '${idempotencyKey}' already exists for this plan`,
      errorCode: ErrorCode.DR_EXECUTION_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class DrConcurrentOperationLockedException extends AtlasException {
  constructor(scopeKey: string) {
    super({
      message: `A recovery operation is already in progress for scope '${scopeKey}' — concurrent recovery operations against the same scope are not allowed`,
      errorCode: ErrorCode.DR_CONCURRENT_OPERATION_LOCKED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class DrBackupNotEligibleException extends AtlasException {
  constructor(targetType: string, reason: string) {
    super({
      message: `No eligible backup found for target type '${targetType}': ${reason}`,
      errorCode: ErrorCode.DR_BACKUP_NOT_ELIGIBLE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class DrBackupStaleException extends AtlasException {
  constructor(targetType: string) {
    super({
      message: `The most recent backup for target type '${targetType}' is older than the policy's RPO target`,
      errorCode: ErrorCode.DR_BACKUP_STALE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class DrBackupIntegrityFailedException extends AtlasException {
  constructor(targetType: string) {
    super({
      message: `Backup integrity validation failed for target type '${targetType}'`,
      errorCode: ErrorCode.DR_BACKUP_INTEGRITY_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class DrTenantIsolationViolationException extends AtlasException {
  constructor(workspaceId: string) {
    super({
      message: `Recovery scope includes workspace '${workspaceId}' which is outside the authorized tenant boundary for this operation`,
      errorCode: ErrorCode.DR_TENANT_ISOLATION_VIOLATION,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class DrAccessDeniedException extends AtlasException {
  constructor(action: string) {
    super({
      message: `You do not have permission to ${action}`,
      errorCode: ErrorCode.DR_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
