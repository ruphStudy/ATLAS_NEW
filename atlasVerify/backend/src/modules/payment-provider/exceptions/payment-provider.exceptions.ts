import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class PaymentProviderNotRegisteredException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `No adapter is registered for payment provider '${providerKey}'`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_NOT_REGISTERED,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PaymentProviderAccountNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Payment provider account '${id}' not found`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_ACCOUNT_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PaymentProviderAccountAlreadyExistsException extends AtlasException {
  constructor(providerKey: string, accountHandle: string) {
    super({
      message: `An account '${accountHandle}' for provider '${providerKey}' already exists`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_ACCOUNT_ALREADY_EXISTS,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PaymentProviderAccountInactiveException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Payment provider account '${id}' is not active`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_ACCOUNT_INACTIVE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PaymentProviderNoCapableAccountException extends AtlasException {
  constructor(capability: string) {
    super({
      message: `No active payment provider account can satisfy capability '${capability}' for this request`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_NO_CAPABLE_ACCOUNT,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PaymentProviderCredentialsNotConfiguredException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Payment provider account '${id}' has no credentials configured`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_CREDENTIALS_NOT_CONFIGURED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PaymentProviderCredentialInvalidException extends AtlasException {
  constructor(reason: string) {
    super({
      message: `Invalid payment provider credentials: ${reason}`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_CREDENTIAL_INVALID,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PaymentTransactionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Payment transaction '${id}' not found`,
      errorCode: ErrorCode.PAYMENT_TRANSACTION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class PaymentDuplicateRequestException extends AtlasException {
  constructor(idempotencyKey: string) {
    super({
      message: `A request with idempotency key '${idempotencyKey}' is already in progress or completed`,
      errorCode: ErrorCode.PAYMENT_DUPLICATE_REQUEST,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class PaymentProviderRequestFailedException extends AtlasException {
  constructor(providerKey: string, reason: string) {
    super({
      message: `Payment provider '${providerKey}' request failed: ${reason}`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_REQUEST_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class PaymentProviderRequestTimeoutException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Payment provider '${providerKey}' request timed out`,
      errorCode: ErrorCode.PAYMENT_PROVIDER_REQUEST_TIMEOUT,
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
    });
  }
}

export class PaymentWebhookSignatureInvalidException extends AtlasException {
  constructor() {
    super({
      message: 'Webhook signature verification failed',
      errorCode: ErrorCode.PAYMENT_WEBHOOK_SIGNATURE_INVALID,
      statusCode: HttpStatus.UNAUTHORIZED,
    });
  }
}

export class PaymentAccessDeniedException extends AtlasException {
  constructor() {
    super({
      message: 'You do not have permission to manage payment providers for this workspace',
      errorCode: ErrorCode.PAYMENT_ACCESS_DENIED,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
