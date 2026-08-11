import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { IAiConfigValidationError } from '../interfaces';

export class AiProviderConfigDuplicateException extends AtlasException {
  constructor(scopeDescription: string) {
    super({
      message: `An active AI provider configuration already exists for ${scopeDescription}`,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiProviderConfigInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition AI provider configuration from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_INVALID_STATUS_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderConfigValidationException extends AtlasException {
  constructor(errors: IAiConfigValidationError[]) {
    super({
      message: 'AI provider configuration validation failed',
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    });
  }
}

export class AiProviderConfigIncompatibleException extends AtlasException {
  constructor(message: string) {
    super({
      message,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_INCOMPATIBLE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderConfigHistoryVersionNotFoundException extends AtlasException {
  constructor(configId: string, version: number) {
    super({
      message: `Version ${version} not found in history for AI provider configuration '${configId}'`,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_HISTORY_VERSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderConfigImmutableException extends AtlasException {
  constructor(status: string) {
    super({
      message: `Cannot modify an AI provider configuration in '${status}' status`,
      errorCode: ErrorCode.AI_PROVIDER_CONFIG_IMMUTABLE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
