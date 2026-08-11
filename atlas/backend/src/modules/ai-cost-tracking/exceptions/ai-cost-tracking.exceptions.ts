import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

export class AiCostPricingConfigNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Cost pricing config '${id}' not found`,
      errorCode: ErrorCode.AI_COST_PRICING_CONFIG_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiCostPricingConfigDuplicateException extends AtlasException {
  constructor(providerKey: string, modelKey?: string) {
    super({
      message: modelKey
        ? `Pricing config for provider '${providerKey}' / model '${modelKey}' already exists in this scope`
        : `Pricing config for provider '${providerKey}' already exists in this scope`,
      errorCode: ErrorCode.AI_COST_PRICING_CONFIG_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

/**
 * Thrown when cost must be calculated but no configured pricing rule applies —
 * cost is never derived from a hardcoded model price as a fallback.
 */
export class AiCostPricingConfigUnresolvedException extends AtlasException {
  constructor(providerKey: string, modelKey?: string) {
    super({
      message: modelKey
        ? `No pricing configuration resolved for provider '${providerKey}' / model '${modelKey}'`
        : `No pricing configuration resolved for provider '${providerKey}'`,
      errorCode: ErrorCode.AI_COST_PRICING_CONFIG_UNRESOLVED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class AiCostBudgetNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Cost budget '${id}' not found`,
      errorCode: ErrorCode.AI_COST_BUDGET_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class AiCostBudgetDuplicateException extends AtlasException {
  constructor(name: string) {
    super({
      message: `Cost budget with name '${name}' already exists for this workspace`,
      errorCode: ErrorCode.AI_COST_BUDGET_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class AiCostRecordNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Cost record '${id}' not found`,
      errorCode: ErrorCode.AI_COST_RECORD_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}
