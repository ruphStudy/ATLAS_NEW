import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class QuotaPolicyNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Quota policy '${id}' not found`,
      errorCode: ErrorCode.QUOTA_POLICY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class QuotaPolicyAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'A quota policy already exists for this scope, resource and feature',
      errorCode: ErrorCode.QUOTA_POLICY_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class QuotaPolicyInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.QUOTA_POLICY_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class QuotaPolicyInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition quota policy from '${from}' to '${to}'`,
      errorCode: ErrorCode.QUOTA_POLICY_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class QuotaOverrideNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Quota override '${id}' not found`,
      errorCode: ErrorCode.QUOTA_OVERRIDE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class QuotaOverrideInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.QUOTA_OVERRIDE_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class QuotaExceededException extends AtlasException {
  constructor(resourceKey: string) {
    super({
      message: `Quota for '${resourceKey}' has been exceeded`,
      errorCode: ErrorCode.QUOTA_EXCEEDED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class QuotaBlockedException extends AtlasException {
  constructor(resourceKey: string) {
    super({
      message: `Quota for '${resourceKey}' is blocked — the hard limit (including any allowed overage) has been reached`,
      errorCode: ErrorCode.QUOTA_BLOCKED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class QuotaAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage quota policies or overrides',
      errorCode: ErrorCode.QUOTA_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
