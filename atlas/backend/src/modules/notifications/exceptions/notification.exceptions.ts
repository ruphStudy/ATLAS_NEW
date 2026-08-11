import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class NotificationNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationInvalidTargetException extends AtlasException {
  constructor(message: string) {
    super({
      message,
      errorCode: ErrorCode.NOTIFICATION_INVALID_TARGET,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

/**
 * Thrown when a recipient tries to read/mutate a notification that was not
 * addressed to them — enforces that no user can ever see another user's
 * notification content via id-guessing.
 */
export class NotificationAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have access to this notification',
      errorCode: ErrorCode.NOTIFICATION_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class NotificationPreferenceNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification preference '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_PREFERENCE_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
