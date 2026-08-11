import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';

export class AiProviderFactoryNoMatchException extends AtlasException {
  constructor(description: string) {
    super({
      message: `No AI provider is available for ${description}`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_NO_MATCH,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderFactoryProviderNotRegisteredException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `AI provider '${providerKey}' is in the registry but not registered with the AI Provider Foundation`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_PROVIDER_NOT_REGISTERED,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

export class AiProviderFactoryUnhealthyException extends AtlasException {
  constructor(providerKey: string, message?: string) {
    super({
      message: message ?? `AI provider '${providerKey}' failed its health check`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_UNHEALTHY,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}

export class AiProviderFactoryCredentialUnavailableException extends AtlasException {
  constructor(providerKey: string, reason: string) {
    super({
      message: `AI provider '${providerKey}' has no usable credential: ${reason}`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_CREDENTIAL_UNAVAILABLE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderFactoryCapabilityUnsupportedException extends AtlasException {
  constructor(providerKey: string, capability: string) {
    super({
      message: `AI provider '${providerKey}' does not support capability '${capability}'`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_CAPABILITY_UNSUPPORTED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderFactoryInitializationFailedException extends AtlasException {
  constructor(providerKey: string, message: string) {
    super({
      message: `Failed to initialize AI provider '${providerKey}': ${message}`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_INITIALIZATION_FAILED,
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  }
}

export class AiProviderFactoryAllFallbacksExhaustedException extends AtlasException {
  constructor(attemptedProviderKeys: string[]) {
    super({
      message: `All AI provider fallbacks exhausted: ${attemptedProviderKeys.join(' -> ')}`,
      errorCode: ErrorCode.AI_PROVIDER_FACTORY_ALL_FALLBACKS_EXHAUSTED,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
  }
}
