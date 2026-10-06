import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class SubscriptionNotFoundException extends AtlasException {
  constructor(idOrScopeKey: string) {
    super({
      message: `Subscription '${idOrScopeKey}' not found`,
      errorCode: ErrorCode.SUBSCRIPTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class SubscriptionDuplicateActiveException extends AtlasException {
  constructor(scopeKey: string) {
    super({
      message: `An active subscription already exists for '${scopeKey}' — pass allowMultipleActive to override`,
      errorCode: ErrorCode.SUBSCRIPTION_DUPLICATE_ACTIVE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class SubscriptionInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition subscription from '${from}' to '${to}'`,
      errorCode: ErrorCode.SUBSCRIPTION_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SubscriptionInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid subscription definition: ${reason}`,
      errorCode: ErrorCode.SUBSCRIPTION_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SubscriptionAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this subscription',
      errorCode: ErrorCode.SUBSCRIPTION_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class SubscriptionAdminOverrideReasonRequiredException extends AtlasException {
  constructor() {
    super({
      message: 'An admin override requires an explicit reason',
      errorCode: ErrorCode.SUBSCRIPTION_ADMIN_OVERRIDE_REASON_REQUIRED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
