import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { IAiCapabilityValidationError } from '../interfaces';

export class AiCapabilityDuplicateException extends AtlasException {
  constructor(capabilityKey: string, version: string) {
    super({
      message: `AI capability '${capabilityKey}' version '${version}' is already defined`,
      errorCode: ErrorCode.AI_CAPABILITY_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiCapabilityInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition AI capability from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_CAPABILITY_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiCapabilityValidationException extends AtlasException {
  constructor(errors: IAiCapabilityValidationError[]) {
    super({
      message: 'AI capability validation failed',
      errorCode: ErrorCode.AI_CAPABILITY_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    });
  }
}

export class AiCapabilityDependencyUnresolvedException extends AtlasException {
  constructor(capabilityKey: string, dependencyKey: string) {
    super({
      message: `AI capability '${capabilityKey}' depends on '${dependencyKey}', which is unavailable`,
      errorCode: ErrorCode.AI_CAPABILITY_DEPENDENCY_UNRESOLVED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiCapabilityUnsupportedException extends AtlasException {
  constructor(capabilityKey: string, description: string) {
    super({
      message: `AI capability '${capabilityKey}' is unsupported for ${description}`,
      errorCode: ErrorCode.AI_CAPABILITY_UNSUPPORTED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiCapabilityPermissionDeniedException extends AtlasException {
  constructor(capabilityKey: string) {
    super({
      message: `Insufficient permissions to use AI capability '${capabilityKey}'`,
      errorCode: ErrorCode.AI_CAPABILITY_PERMISSION_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class AiCapabilityOverrideDuplicateException extends AtlasException {
  constructor(scopeDescription: string) {
    super({
      message: `An AI capability override already exists for ${scopeDescription}`,
      errorCode: ErrorCode.AI_CAPABILITY_OVERRIDE_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}
