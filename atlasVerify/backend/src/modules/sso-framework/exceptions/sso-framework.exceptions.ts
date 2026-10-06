import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SsoConnectionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `SSO connection '${id}' not found`,
      errorCode: ErrorCode.SSO_CONNECTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SsoConnectionAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `An SSO connection named '${name}' already exists in this scope`,
      errorCode: ErrorCode.SSO_CONNECTION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SsoConnectionInactiveException extends AtlasException {
  constructor() {
    super({
      message: 'This SSO connection is not active',
      errorCode: ErrorCode.SSO_CONNECTION_INACTIVE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SsoConnectionInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.SSO_CONNECTION_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SsoConnectionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition SSO connection from '${from}' to '${to}'`,
      errorCode: ErrorCode.SSO_CONNECTION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SsoDomainAlreadyRegisteredException extends AtlasException {
  constructor(domain: string) {
    super({
      message: `Domain '${domain}' is already routed to another SSO connection`,
      errorCode: ErrorCode.SSO_DOMAIN_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SsoDomainNotRoutableException extends AtlasException {
  constructor(domain: string) {
    super({
      message: `No active SSO connection is configured for domain '${domain}'`,
      errorCode: ErrorCode.SSO_DOMAIN_NOT_ROUTABLE,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SsoLoginRequestNotFoundException extends AtlasException {
  constructor() {
    super({
      message: 'This SSO login request was not found',
      errorCode: ErrorCode.SSO_LOGIN_REQUEST_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SsoLoginRequestExpiredException extends AtlasException {
  constructor() {
    super({
      message: 'This SSO login request has expired — please sign in again',
      errorCode: ErrorCode.SSO_LOGIN_REQUEST_EXPIRED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SsoLoginRequestInvalidStateException extends AtlasException {
  constructor() {
    super({
      message: 'The provided state does not match a pending SSO login request',
      errorCode: ErrorCode.SSO_LOGIN_REQUEST_INVALID_STATE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

/** Deliberately generic — never echoes back raw assertion/claim/signature detail (never log or expose sensitive identity material). */
export class SsoAssertionInvalidException extends AtlasException {
  constructor(reason = 'SSO assertion validation failed') {
    super({
      message: reason,
      errorCode: ErrorCode.SSO_ASSERTION_INVALID,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class SsoIdentityAlreadyLinkedException extends AtlasException {
  constructor() {
    super({
      message: 'This external identity is already linked to a different ATLAS account',
      errorCode: ErrorCode.SSO_IDENTITY_ALREADY_LINKED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SsoProvisioningDisabledException extends AtlasException {
  constructor() {
    super({
      message: 'No linked ATLAS account exists for this identity and just-in-time provisioning is disabled for this connection',
      errorCode: ErrorCode.SSO_PROVISIONING_DISABLED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class SsoAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this SSO connection',
      errorCode: ErrorCode.SSO_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
