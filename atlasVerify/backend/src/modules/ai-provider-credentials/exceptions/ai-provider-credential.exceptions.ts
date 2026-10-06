import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { ICredentialValidationError } from '../interfaces';

export class AiProviderCredentialDuplicateException extends AtlasException {
  constructor(scopeDescription: string) {
    super({
      message: `An active AI provider credential already exists for ${scopeDescription}`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiProviderCredentialInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition AI provider credential from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderCredentialValidationException extends AtlasException {
  constructor(errors: ICredentialValidationError[]) {
    super({
      message: 'AI provider credential validation failed',
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    });
  }
}

export class AiProviderCredentialExpiredException extends AtlasException {
  constructor(id: string) {
    super({
      message: `AI provider credential '${id}' has expired`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_EXPIRED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderCredentialRevokedException extends AtlasException {
  constructor(id: string) {
    super({
      message: `AI provider credential '${id}' has been revoked and cannot be modified`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_REVOKED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderCredentialHistoryVersionNotFoundException extends AtlasException {
  constructor(credentialId: string, version: number) {
    super({
      message: `Version ${version} not found in history for AI provider credential '${credentialId}'`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_HISTORY_VERSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

/**
 * Deliberately never includes the underlying crypto error message or any
 * field value — only a generic notice that decryption failed.
 */
export class AiProviderCredentialDecryptionException extends AtlasException {
  constructor(credentialId: string) {
    super({
      message: `Failed to decrypt AI provider credential '${credentialId}'`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_DECRYPTION_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class AiProviderCredentialConnectionValidationException extends AtlasException {
  constructor(providerKey: string, message?: string) {
    super({
      message: message ?? `Connection validation failed for AI provider '${providerKey}'`,
      errorCode: ErrorCode.AI_PROVIDER_CREDENTIAL_CONNECTION_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
