import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class ThemeNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Theme '${idOrKey}' not found`,
      errorCode: ErrorCode.THEME_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class ThemeAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Theme '${key}' already exists in this scope`,
      errorCode: ErrorCode.THEME_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class ThemeIsSystemThemeException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Theme '${key}' is system-provided and cannot be modified or deleted`,
      errorCode: ErrorCode.THEME_IS_SYSTEM_THEME,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class ThemeInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition theme from '${from}' to '${to}'`,
      errorCode: ErrorCode.THEME_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ThemeInvalidTokensException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid theme tokens: ${reason}`,
      errorCode: ErrorCode.THEME_INVALID_TOKENS,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ThemeAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this theme',
      errorCode: ErrorCode.THEME_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
