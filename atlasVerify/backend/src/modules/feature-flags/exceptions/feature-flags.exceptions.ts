import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class FeatureFlagNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Feature flag '${key}' not found`,
      errorCode: ErrorCode.FEATURE_FLAG_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class FeatureFlagAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `A feature flag with key '${key}' already exists`,
      errorCode: ErrorCode.FEATURE_FLAG_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class FeatureFlagInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.FEATURE_FLAG_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FeatureFlagInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition feature flag from '${from}' to '${to}'`,
      errorCode: ErrorCode.FEATURE_FLAG_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FeatureFlagCircularDependencyException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Adding this dependency would create a circular dependency involving '${key}'`,
      errorCode: ErrorCode.FEATURE_FLAG_CIRCULAR_DEPENDENCY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FeatureFlagConflictingRuleException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.FEATURE_FLAG_CONFLICTING_RULE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FeatureFlagOverrideNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Feature flag override '${id}' not found`,
      errorCode: ErrorCode.FEATURE_FLAG_OVERRIDE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class FeatureFlagOverrideAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'An override for this flag already exists in this scope',
      errorCode: ErrorCode.FEATURE_FLAG_OVERRIDE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class FeatureFlagInvalidTargetingException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.FEATURE_FLAG_INVALID_TARGETING,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class FeatureFlagAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage feature flags',
      errorCode: ErrorCode.FEATURE_FLAG_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
