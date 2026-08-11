import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SettingDefinitionNotFoundException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Setting definition '${key}' not found`,
      errorCode: ErrorCode.SETTING_DEFINITION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SettingDefinitionAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Setting definition '${key}' already exists`,
      errorCode: ErrorCode.SETTING_DEFINITION_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SettingValueNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Setting value '${id}' not found`,
      errorCode: ErrorCode.SETTING_VALUE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SettingValueAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'A setting value already exists for this scope — update it instead of creating a duplicate',
      errorCode: ErrorCode.SETTING_VALUE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SettingScopeNotAllowedException extends AtlasException {
  constructor(key: string, scope: string) {
    super({
      message: `Setting '${key}' does not allow the '${scope}' scope`,
      errorCode: ErrorCode.SETTING_SCOPE_NOT_ALLOWED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SettingInvalidValueException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid setting value: ${reason}`,
      errorCode: ErrorCode.SETTING_INVALID_VALUE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SettingInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition setting value from '${from}' to '${to}'`,
      errorCode: ErrorCode.SETTING_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SettingAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this setting',
      errorCode: ErrorCode.SETTING_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class SettingDependencyNotSatisfiedException extends AtlasException {
  constructor(dependencyKey: string) {
    super({
      message: `Required setting dependency '${dependencyKey}' is not satisfied`,
      errorCode: ErrorCode.SETTING_DEPENDENCY_NOT_SATISFIED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SettingHistoryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Setting value history entry '${id}' not found`,
      errorCode: ErrorCode.SETTING_HISTORY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
