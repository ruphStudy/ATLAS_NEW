import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { IRegistryValidationError } from '../interfaces';

export class AiProviderRegistryDuplicateException extends AtlasException {
  constructor(scopeDescription: string) {
    super({
      message: `An AI provider registry entry already exists for ${scopeDescription}`,
      errorCode: ErrorCode.AI_PROVIDER_REGISTRY_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiProviderRegistryInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition AI provider registry entry from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_PROVIDER_REGISTRY_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderRegistryValidationException extends AtlasException {
  constructor(errors: IRegistryValidationError[]) {
    super({
      message: 'AI provider registry entry validation failed',
      errorCode: ErrorCode.AI_PROVIDER_REGISTRY_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    });
  }
}

export class AiProviderRegistryNoMatchException extends AtlasException {
  constructor(description: string) {
    super({
      message: `No active AI provider registry entry matches ${description}`,
      errorCode: ErrorCode.AI_PROVIDER_REGISTRY_NO_MATCH,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderRegistrySyncFailedException extends AtlasException {
  constructor(message: string) {
    super({
      message: `AI provider registry synchronization failed: ${message}`,
      errorCode: ErrorCode.AI_PROVIDER_REGISTRY_SYNC_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
