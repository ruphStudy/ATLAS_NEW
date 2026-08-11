import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class WebhookEndpointNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Webhook endpoint '${id}' not found`,
      errorCode: ErrorCode.WEBHOOK_ENDPOINT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WebhookEndpointAlreadyExistsException extends AtlasException {
  constructor(name: string) {
    super({
      message: `A webhook endpoint named '${name}' already exists in this scope`,
      errorCode: ErrorCode.WEBHOOK_ENDPOINT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WebhookEndpointInactiveException extends AtlasException {
  constructor() {
    super({
      message: 'This webhook endpoint is disabled',
      errorCode: ErrorCode.WEBHOOK_ENDPOINT_INACTIVE,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WebhookEndpointInvalidUrlException extends AtlasException {
  constructor(url: string) {
    super({
      message: `'${url}' is not a valid webhook endpoint URL`,
      errorCode: ErrorCode.WEBHOOK_ENDPOINT_INVALID_URL,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WebhookEndpointInvalidDefinitionException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.WEBHOOK_ENDPOINT_INVALID_DEFINITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WebhookDeliveryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Webhook delivery '${id}' not found`,
      errorCode: ErrorCode.WEBHOOK_DELIVERY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class WebhookDeliveryInvalidStateTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition webhook delivery from '${from}' to '${to}'`,
      errorCode: ErrorCode.WEBHOOK_DELIVERY_INVALID_STATE_TRANSITION,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class WebhookDeliveryAlreadyTerminalException extends AtlasException {
  constructor(status: string) {
    super({
      message: `This delivery is already in a terminal state ('${status}') and cannot be cancelled`,
      errorCode: ErrorCode.WEBHOOK_DELIVERY_ALREADY_TERMINAL,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class WebhookAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage this webhook endpoint',
      errorCode: ErrorCode.WEBHOOK_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
