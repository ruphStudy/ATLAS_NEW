import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class NoteNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Note '${id}' not found`,
      errorCode: ErrorCode.NOTE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NoteAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to access this note',
      errorCode: ErrorCode.NOTE_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class NoteInvalidStateTransitionException extends AtlasException {
  constructor(from: string, action: string) {
    super({
      message: `Cannot perform '${action}' on a note in status '${from}'`,
      errorCode: ErrorCode.NOTE_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class NoteAttachmentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Attachment '${id}' not found on this note`,
      errorCode: ErrorCode.NOTE_ATTACHMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NoteAttachmentAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'This file is already attached to this note',
      errorCode: ErrorCode.NOTE_ATTACHMENT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NoteParentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Parent note/comment '${id}' not found`,
      errorCode: ErrorCode.NOTE_PARENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
