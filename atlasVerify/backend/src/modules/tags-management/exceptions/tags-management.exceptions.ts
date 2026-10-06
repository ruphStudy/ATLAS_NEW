import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class TagNotFoundException extends AtlasException {
  constructor(idOrSlug: string) {
    super({
      message: `Tag '${idOrSlug}' not found`,
      errorCode: ErrorCode.TAG_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TagAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Tag '${name}' already exists in this scope`,
      errorCode: ErrorCode.TAG_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TagIsSystemTagException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Tag '${name}' is system-managed and cannot be modified or deleted`,
      errorCode: ErrorCode.TAG_IS_SYSTEM_TAG,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class TagInvalidStateTransitionException extends AtlasException {
  constructor(from: string, action: string) {
    super({
      message: `Cannot perform '${action}' on a tag in status '${from}'`,
      errorCode: ErrorCode.TAG_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TagAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this tag',
      errorCode: ErrorCode.TAG_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class TagGroupNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Tag group '${id}' not found`,
      errorCode: ErrorCode.TAG_GROUP_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TagGroupAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Tag group '${name}' already exists in this scope`,
      errorCode: ErrorCode.TAG_GROUP_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TagAssignmentAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'This tag is already assigned to this entity',
      errorCode: ErrorCode.TAG_ASSIGNMENT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TagAssignmentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Tag assignment '${id}' not found`,
      errorCode: ErrorCode.TAG_ASSIGNMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TagSavedViewNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Saved view '${id}' not found`,
      errorCode: ErrorCode.TAG_SAVED_VIEW_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
