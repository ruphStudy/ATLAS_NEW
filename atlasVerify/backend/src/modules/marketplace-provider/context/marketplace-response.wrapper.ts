import {
  MarketplaceResponse,
  MarketplaceResponseMeta,
  NormalizedMarketplaceError,
} from '../interfaces';

/**
 * Builds standardized MarketplaceResponse wrappers.
 * All provider results are wrapped before returning to callers.
 */
export class MarketplaceResponseWrapper {
  static success<TResult>(
    result: TResult,
    meta: Partial<MarketplaceResponseMeta> & Pick<MarketplaceResponseMeta, 'providerKey' | 'correlationId' | 'requestId' | 'processingTimeMs'>,
    warnings: string[] = [],
  ): MarketplaceResponse<TResult> {
    return {
      success: true,
      result,
      errors: [],
      warnings,
      meta: {
        ...meta,
        processingTimeMs: meta.processingTimeMs,
      },
    };
  }

  static failure<TResult = unknown>(
    errors: NormalizedMarketplaceError[],
    meta: Partial<MarketplaceResponseMeta> & Pick<MarketplaceResponseMeta, 'providerKey' | 'correlationId' | 'requestId' | 'processingTimeMs'>,
    warnings: string[] = [],
  ): MarketplaceResponse<TResult> {
    return {
      success: false,
      errors,
      warnings,
      meta: { ...meta, processingTimeMs: meta.processingTimeMs },
    };
  }

  static fromError<TResult = unknown>(
    error: NormalizedMarketplaceError,
    meta: Partial<MarketplaceResponseMeta> & Pick<MarketplaceResponseMeta, 'providerKey' | 'correlationId' | 'requestId' | 'processingTimeMs'>,
  ): MarketplaceResponse<TResult> {
    return MarketplaceResponseWrapper.failure([error], meta);
  }
}
