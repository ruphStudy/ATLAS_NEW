import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class OAuthClientNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `OAuth client '${id}' not found`,
      errorCode: ErrorCode.OAUTH_CLIENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OAuthClientAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `An OAuth client named '${name}' already exists in this scope`,
      errorCode: ErrorCode.OAUTH_CLIENT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class OAuthClientInactiveException extends AtlasException {
  constructor() {
    super({
      message: 'This OAuth client is not active',
      errorCode: ErrorCode.OAUTH_CLIENT_INACTIVE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthClientInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.OAUTH_CLIENT_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthClientInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition OAuth client from '${from}' to '${to}'`,
      errorCode: ErrorCode.OAUTH_CLIENT_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthConnectionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `OAuth connection '${id}' not found`,
      errorCode: ErrorCode.OAUTH_CONNECTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OAuthConnectionAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'An active connection already exists for this scope, provider and account',
      errorCode: ErrorCode.OAUTH_CONNECTION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class OAuthConnectionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition OAuth connection from '${from}' to '${to}'`,
      errorCode: ErrorCode.OAUTH_CONNECTION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthTokenExchangeFailedException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `OAuth token exchange failed: ${reason}`,
      errorCode: ErrorCode.OAUTH_TOKEN_EXCHANGE_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class OAuthTokenRefreshFailedException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `OAuth token refresh failed: ${reason}`,
      errorCode: ErrorCode.OAUTH_TOKEN_REFRESH_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class OAuthAuthorizationRequestNotFoundException extends AtlasException {
  constructor() {
    super({
      message: 'This authorization request was not found',
      errorCode: ErrorCode.OAUTH_AUTHORIZATION_REQUEST_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class OAuthAuthorizationRequestExpiredException extends AtlasException {
  constructor() {
    super({
      message: 'This authorization request has expired — restart the authorization flow',
      errorCode: ErrorCode.OAUTH_AUTHORIZATION_REQUEST_EXPIRED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthAuthorizationRequestInvalidStateException extends AtlasException {
  constructor() {
    super({
      message: 'The provided state does not match a pending authorization request',
      errorCode: ErrorCode.OAUTH_AUTHORIZATION_REQUEST_INVALID_STATE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthRedirectUriNotAllowedException extends AtlasException {
  constructor(uri: string) {
    super({
      message: `Redirect URI '${uri}' is not registered for this OAuth client`,
      errorCode: ErrorCode.OAUTH_REDIRECT_URI_NOT_ALLOWED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class OAuthAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this OAuth client or connection',
      errorCode: ErrorCode.OAUTH_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
