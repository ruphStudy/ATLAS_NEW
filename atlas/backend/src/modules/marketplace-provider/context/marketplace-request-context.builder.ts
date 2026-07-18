import { v4 as uuidv4 } from 'uuid';
import {
  MarketplaceKey,
  MarketplaceRequestContext,
} from '../interfaces';

/**
 * Builds standardized MarketplaceRequestContext objects.
 * All marketplace operations must be wrapped in a context.
 * Never puts credentials inside context.
 */
export class MarketplaceRequestContextBuilder {
  private readonly _context: MarketplaceRequestContext;

  constructor(
    workspaceId: string,
    providerKey: string,
    marketplaceKey: MarketplaceKey,
  ) {
    this._context = {
      correlationId: uuidv4(),
      workspaceId,
      providerKey,
      marketplaceKey,
    };
  }

  withUserId(userId: string): this {
    (this._context as { userId?: string }).userId = userId;
    return this;
  }

  withAccountId(accountId: string): this {
    this._context.accountId = accountId;
    return this;
  }

  withCountry(country: string): this {
    this._context.country = country;
    return this;
  }

  withCurrency(currency: string): this {
    this._context.currency = currency;
    return this;
  }

  withRegion(region: string): this {
    this._context.region = region;
    return this;
  }

  withLocale(locale: string): this {
    this._context.locale = locale;
    return this;
  }

  withMetadata(metadata: Record<string, unknown>): this {
    this._context.requestMetadata = {
      ...this._context.requestMetadata,
      ...metadata,
    };
    return this;
  }

  build(): MarketplaceRequestContext {
    return { ...this._context };
  }

  static create(
    workspaceId: string,
    providerKey: string,
    marketplaceKey: MarketplaceKey,
  ): MarketplaceRequestContextBuilder {
    return new MarketplaceRequestContextBuilder(workspaceId, providerKey, marketplaceKey);
  }
}

/**
 * Masks a correlation ID for logging (last 8 chars only).
 */
export function maskCorrelationId(id: string): string {
  if (id.length <= 8) return id;
  return `***${id.slice(-8)}`;
}
