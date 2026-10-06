import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class RuleNotFoundException extends AtlasException {
  constructor(idOrKey: string) {
    super({
      message: `Rule '${idOrKey}' not found`,
      errorCode: ErrorCode.RULE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class RuleAlreadyExistsException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Rule '${key}' already exists in this scope and module`,
      errorCode: ErrorCode.RULE_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class RuleIsSystemRuleException extends AtlasException {
  constructor(key: string) {
    super({
      message: `Rule '${key}' is system-provided and cannot be modified or deleted`,
      errorCode: ErrorCode.RULE_IS_SYSTEM_RULE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class RuleInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition rule from '${from}' to '${to}'`,
      errorCode: ErrorCode.RULE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RuleInvalidDefinitionException extends AtlasException {
  constructor(issues: string[]) {
    super({
      message: `Invalid rule definition: ${issues.join('; ')}`,
      errorCode: ErrorCode.RULE_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RuleCircularDependencyException extends AtlasException {
  constructor(cycle: string[]) {
    super({
      message: `Publishing this rule would create a circular execution chain: ${cycle.join(' -> ')}`,
      errorCode: ErrorCode.RULE_CIRCULAR_DEPENDENCY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RuleAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this rule',
      errorCode: ErrorCode.RULE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class RuleActionHandlerNotRegisteredException extends AtlasException {
  constructor(actionType: string) {
    super({
      message: `No handler is registered for rule action type '${actionType}'`,
      errorCode: ErrorCode.RULE_ACTION_HANDLER_NOT_REGISTERED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RuleExecutionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Rule execution '${id}' not found`,
      errorCode: ErrorCode.RULE_EXECUTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
