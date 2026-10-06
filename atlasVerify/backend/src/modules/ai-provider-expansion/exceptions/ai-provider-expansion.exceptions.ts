import { HttpStatus } from '@nestjs/common';
import { AtlasException } from '../../../common/exceptions/atlas.exception';
import { ErrorCode } from '../../../common/exceptions/error-codes.enum';
import { IExpansionValidationError } from '../interfaces';

export class AiProviderExpansionNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `AI provider expansion '${id}' not found`,
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiProviderExpansionDuplicateException extends AtlasException {
  constructor(scopeDescription: string) {
    super({
      message: `An AI provider expansion already exists for ${scopeDescription}`,
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiProviderExpansionInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition AI provider expansion from '${from}' to '${to}'`,
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiProviderExpansionValidationException extends AtlasException {
  constructor(errors: IExpansionValidationError[]) {
    super({
      message: 'AI provider expansion validation failed',
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: errors.map((e) => `${e.field}: ${e.message}`),
    });
  }
}

export class AiProviderExpansionAdapterIncompatibleException extends AtlasException {
  constructor(providerKey: string, targetState: string, issues: string[]) {
    super({
      message: `Cannot promote AI provider '${providerKey}' to '${targetState}': adapter is not compatible`,
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_ADAPTER_INCOMPATIBLE,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: issues,
    });
  }
}

export class AiProviderExpansionNotEligibleException extends AtlasException {
  constructor(reason: string) {
    super({
      message: reason,
      errorCode: ErrorCode.AI_PROVIDER_EXPANSION_NOT_ELIGIBLE,
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}
