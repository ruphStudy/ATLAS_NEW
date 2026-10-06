import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class LicenseNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `License '${id}' not found`,
      errorCode: ErrorCode.LICENSE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class LicenseAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'An active license already exists for this scope and plan',
      errorCode: ErrorCode.LICENSE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class LicenseInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.LICENSE_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class LicenseInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition license from '${from}' to '${to}'`,
      errorCode: ErrorCode.LICENSE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class LicenseExpiredException extends AtlasException {
  constructor() {
    super({
      message: 'This license has expired',
      errorCode: ErrorCode.LICENSE_EXPIRED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class LicenseSuspendedException extends AtlasException {
  constructor() {
    super({
      message: 'This license is suspended',
      errorCode: ErrorCode.LICENSE_SUSPENDED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class LicenseRevokedException extends AtlasException {
  constructor() {
    super({
      message: 'This license has been revoked',
      errorCode: ErrorCode.LICENSE_REVOKED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class LicenseActivationLimitReachedException extends AtlasException {
  constructor() {
    super({
      message: 'This license has reached its maximum number of activations',
      errorCode: ErrorCode.LICENSE_ACTIVATION_LIMIT_REACHED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class LicenseValidationFailedException extends AtlasException {
  constructor(reason = 'License validation failed') {
    super({
      message: reason,
      errorCode: ErrorCode.LICENSE_VALIDATION_FAILED,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class LicenseTokenInvalidException extends AtlasException {
  constructor(reason = 'The provided license token is invalid') {
    super({
      message: reason,
      errorCode: ErrorCode.LICENSE_TOKEN_INVALID,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class LicenseAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this license',
      errorCode: ErrorCode.LICENSE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
