import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class PlanNotFoundException extends AtlasException {
  constructor(idOrCode: string) {
    super({
      message: `Plan '${idOrCode}' not found`,
      errorCode: ErrorCode.PLAN_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PlanAlreadyExistsException extends AtlasException {
  constructor(code: string) {
    super({
      message: `Plan code '${code}' already exists`,
      errorCode: ErrorCode.PLAN_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PlanImmutablePublishedVersionException extends AtlasException {
  constructor(code: string, version: number) {
    super({
      message: `Plan '${code}' v${version} is published and immutable — create a new version instead`,
      errorCode: ErrorCode.PLAN_IMMUTABLE_PUBLISHED_VERSION,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PlanInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition plan from '${from}' to '${to}'`,
      errorCode: ErrorCode.PLAN_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PlanInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid plan definition: ${reason}`,
      errorCode: ErrorCode.PLAN_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PlanIncompatibleTransitionException extends AtlasException {
  constructor(fromCode: string, toCode: string, reason: string) {
    super({
      message: `Cannot move from plan '${fromCode}' to '${toCode}': ${reason}`,
      errorCode: ErrorCode.PLAN_INCOMPATIBLE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
