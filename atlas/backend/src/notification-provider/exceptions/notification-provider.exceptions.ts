import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class NotificationProviderNotFoundException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Notification provider '${providerKey}' is not registered`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationProviderAlreadyRegisteredException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Notification provider '${providerKey}' is already registered`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NotificationProviderDisabledException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Notification provider '${providerKey}' is disabled`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_DISABLED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderChannelUnsupportedException extends AtlasException {
  constructor(providerKey: string, channel: string) {
    super({
      message: `Notification provider '${providerKey}' does not support channel '${channel}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CHANNEL_UNSUPPORTED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderTimeoutException extends AtlasException {
  constructor(providerKey: string, timeoutMs: number) {
    super({
      message: `Notification provider '${providerKey}' timed out after ${timeoutMs}ms`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_TIMEOUT,
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
    });
  }
}

export class NotificationProviderRateLimitedException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Notification provider '${providerKey}' rate limit exceeded`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_RATE_LIMITED,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
    });
  }
}

export class NotificationProviderUnavailableException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Notification provider '${providerKey}' is unavailable`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_UNAVAILABLE,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

export class NotificationProviderRequestFailedException extends AtlasException {
  constructor(providerKey: string, message: string) {
    super({
      message: `Notification provider '${providerKey}' request failed: ${message}`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_REQUEST_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class NotificationProviderAllFallbacksExhaustedException extends AtlasException {
  constructor(attempted: string[]) {
    super({
      message: `All notification provider fallbacks exhausted: ${attempted.join(', ')}`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_ALL_FALLBACKS_EXHAUSTED,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

/**
 * Thrown when a channel enforces "approved template required outside an
 * active session/consent window" (e.g. WhatsApp Business API's 24-hour
 * customer-service-window rule) and the caller attempted free-text content
 * without one.
 */
export class NotificationProviderTemplateRequiredException extends AtlasException {
  constructor(providerKey: string, reason: string) {
    super({
      message: `Notification provider '${providerKey}' requires an approved template: ${reason}`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_TEMPLATE_REQUIRED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
