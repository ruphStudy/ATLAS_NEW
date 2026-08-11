import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../common/exceptions/error-codes.enum';

export class AiProviderNotFoundException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' is not registered`,
      errorCode: ErrorCode.AI_PROVIDER_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderAlreadyRegisteredException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' is already registered`,
      errorCode: ErrorCode.AI_PROVIDER_ALREADY_REGISTERED,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiProviderNotConfiguredException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' has no configuration registered`,
      errorCode: ErrorCode.AI_PROVIDER_NOT_CONFIGURED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderDisabledException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' is disabled`,
      errorCode: ErrorCode.AI_PROVIDER_DISABLED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderCapabilityUnsupportedException extends AtlasException {
  constructor(providerKey: string, capability: string) {
    super({
      message: `AI provider '${providerKey}' does not support capability '${capability}'`,
      errorCode: ErrorCode.AI_PROVIDER_CAPABILITY_UNSUPPORTED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderModelNotFoundException extends AtlasException {
  constructor(providerKey: string, modelId: string) {
    super({
      message: `AI provider '${providerKey}' does not expose model '${modelId}'`,
      errorCode: ErrorCode.AI_PROVIDER_MODEL_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderConfigInvalidException extends AtlasException {
  constructor(message: string) {
    super({
      message,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_INVALID,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderTimeoutException extends AtlasException {
  constructor(providerKey: string, timeoutMs: number) {
    super({
      message: `AI provider '${providerKey}' request timed out after ${timeoutMs}ms`,
      errorCode: ErrorCode.AI_PROVIDER_TIMEOUT,
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
    });
  }
}

export class AiProviderRateLimitedException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' rate limit exceeded`,
      errorCode: ErrorCode.AI_PROVIDER_RATE_LIMITED,
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
    });
  }
}

export class AiProviderUnavailableException extends AtlasException {
  constructor(providerKey: string, message?: string) {
    super({
      message: message ?? `AI provider '${providerKey}' is unavailable`,
      errorCode: ErrorCode.AI_PROVIDER_UNAVAILABLE,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

export class AiProviderRequestFailedException extends AtlasException {
  constructor(providerKey: string, message: string) {
    super({
      message: `AI provider '${providerKey}' request failed: ${message}`,
      errorCode: ErrorCode.AI_PROVIDER_REQUEST_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class AiProviderInvalidResponseException extends AtlasException {
  constructor(providerKey: string, message: string) {
    super({
      message: `AI provider '${providerKey}' returned an invalid response: ${message}`,
      errorCode: ErrorCode.AI_PROVIDER_INVALID_RESPONSE,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class AiProviderAllFallbacksExhaustedException extends AtlasException {
  constructor(providerKeys: string[]) {
    super({
      message: `All AI provider fallbacks exhausted: ${providerKeys.join(' -> ')}`,
      errorCode: ErrorCode.AI_PROVIDER_ALL_FALLBACKS_EXHAUSTED,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}
