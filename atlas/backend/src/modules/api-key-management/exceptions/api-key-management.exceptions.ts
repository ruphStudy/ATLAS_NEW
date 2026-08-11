import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class ApiKeyNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `API key '${id}' not found`,
      errorCode: ErrorCode.API_KEY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ApiKeyAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `An API key named '${name}' already exists in this scope`,
      errorCode: ErrorCode.API_KEY_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ApiKeyInvalidException extends AtlasException {
  constructor(reason = 'The provided API key is invalid') {
    super({
      message: reason,
      errorCode: ErrorCode.API_KEY_INVALID,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class ApiKeyExpiredException extends AtlasException {
  constructor() {
    super({
      message: 'This API key has expired',
      errorCode: ErrorCode.API_KEY_EXPIRED,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class ApiKeyInactiveException extends AtlasException {
  constructor() {
    super({
      message: 'This API key is not active',
      errorCode: ErrorCode.API_KEY_INACTIVE,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class ApiKeyIpNotAllowedException extends AtlasException {
  constructor() {
    super({
      message: 'The request IP address is not on this API key\'s allowlist',
      errorCode: ErrorCode.API_KEY_IP_NOT_ALLOWED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ApiKeyPermissionDeniedException extends AtlasException {
  constructor(permission: string) {
    super({
      message: `This API key does not have the required permission '${permission}'`,
      errorCode: ErrorCode.API_KEY_PERMISSION_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ApiKeyRateLimitExceededException extends AtlasException {
  constructor() {
    super({
      message: 'This API key has exceeded its configured rate limit',
      errorCode: ErrorCode.API_KEY_RATE_LIMIT_EXCEEDED,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
    });
  }
}

export class ApiKeyInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition API key from '${from}' to '${to}'`,
      errorCode: ErrorCode.API_KEY_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ApiKeyAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this API key',
      errorCode: ErrorCode.API_KEY_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
