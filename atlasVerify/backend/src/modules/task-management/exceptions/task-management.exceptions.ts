import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class TaskNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Task '${id}' not found`,
      errorCode: ErrorCode.TASK_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TaskAlreadyExistsException extends AtlasException {
  constructor(dedupeKey: string) {
    super({
      message: `A task with dedupe key '${dedupeKey}' already exists in this workspace`,
      errorCode: ErrorCode.TASK_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TaskInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition task from '${from}' to '${to}'`,
      errorCode: ErrorCode.TASK_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TaskDependencyNotSatisfiedException extends AtlasException {
  constructor(dependencyId: string) {
    super({
      message: `Dependency task '${dependencyId}' is not yet completed`,
      errorCode: ErrorCode.TASK_DEPENDENCY_NOT_SATISFIED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TaskChecklistItemNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Checklist item '${id}' not found on this task`,
      errorCode: ErrorCode.TASK_CHECKLIST_ITEM_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TaskCommentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Comment '${id}' not found on this task`,
      errorCode: ErrorCode.TASK_COMMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TaskAttachmentNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Attachment '${id}' not found on this task`,
      errorCode: ErrorCode.TASK_ATTACHMENT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TaskAttachmentAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'This file is already attached to this task',
      errorCode: ErrorCode.TASK_ATTACHMENT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TaskWatcherAlreadyExistsException extends AtlasException {
  constructor() {
    super({
      message: 'This user is already watching this task',
      errorCode: ErrorCode.TASK_WATCHER_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class TaskWatcherNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Watcher '${id}' not found on this task`,
      errorCode: ErrorCode.TASK_WATCHER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class TaskAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to perform this action on this task',
      errorCode: ErrorCode.TASK_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
