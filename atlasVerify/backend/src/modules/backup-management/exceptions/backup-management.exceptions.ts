import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class BackupPolicyNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Backup policy '${id}' not found`,
      errorCode: ErrorCode.BACKUP_POLICY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class BackupPolicyAlreadyExistsException extends AtlasException {
  constructor(service: string, dataType: string) {
    super({
      message: `A backup policy already exists for service '${service}' / data type '${dataType}' in this scope`,
      errorCode: ErrorCode.BACKUP_POLICY_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class BackupPolicyInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition backup policy from '${from}' to '${to}'`,
      errorCode: ErrorCode.BACKUP_POLICY_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class BackupPolicyInvalidDefinitionException extends AtlasException {
  constructor(errors: string[]) {
    super({
      message: 'Backup policy validation failed',
      errorCode: ErrorCode.BACKUP_POLICY_INVALID_DEFINITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors,
    });
  }
}

export class BackupJobNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Backup job '${id}' not found`,
      errorCode: ErrorCode.BACKUP_JOB_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class BackupJobDuplicateException extends AtlasException {
  constructor(idempotencyKey: string) {
    super({
      message: `A backup job with idempotency key '${idempotencyKey}' already exists for this policy`,
      errorCode: ErrorCode.BACKUP_JOB_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class BackupJobInvalidStateTransitionException extends AtlasException {
  constructor(from: string, action: string) {
    super({
      message: `Cannot perform '${action}' on a backup job in status '${from}'`,
      errorCode: ErrorCode.BACKUP_JOB_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class BackupConcurrentOperationLockedException extends AtlasException {
  constructor(scopeKey: string) {
    super({
      message: `A backup operation is already in progress for scope '${scopeKey}' — concurrent backup operations against the same scope are not allowed`,
      errorCode: ErrorCode.BACKUP_CONCURRENT_OPERATION_LOCKED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class BackupRecordNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Backup record '${id}' not found`,
      errorCode: ErrorCode.BACKUP_RECORD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class BackupProviderNotRegisteredException extends AtlasException {
  constructor(dataType: string) {
    super({
      message: `No backup provider capable of target type '${dataType}' is registered`,
      errorCode: ErrorCode.BACKUP_PROVIDER_NOT_REGISTERED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class BackupIntegrityCheckFailedException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Integrity check failed for backup record '${id}'`,
      errorCode: ErrorCode.BACKUP_INTEGRITY_CHECK_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class BackupTenantIsolationViolationException extends AtlasException {
  constructor(workspaceId: string) {
    super({
      message: `Backup scope includes workspace '${workspaceId}' which is outside the authorized tenant boundary for this operation`,
      errorCode: ErrorCode.BACKUP_TENANT_ISOLATION_VIOLATION,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class BackupAccessDeniedException extends AtlasException {
  constructor(action: string) {
    super({
      message: `You do not have permission to ${action}`,
      errorCode: ErrorCode.BACKUP_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
