import { Injectable, Logger } from '@nestjs/common';
import { IShopifyCredentials } from '../interfaces/shopify.interfaces';

@Injectable()
export class ShopifyAuthService {
  private readonly logger = new Logger(ShopifyAuthService.name);

  validateCredentials(credentials: IShopifyCredentials): void {
    if (!credentials.shopDomain) {
      throw new Error('Shop domain is required');
    }

    if (!credentials.accessToken) {
      throw new Error('Access token is required');
    }

    if (!this.isValidShopDomain(credentials.shopDomain)) {
      throw new Error('Invalid shop domain format');
    }
  }

  normalizeShopDomain(shopDomain: string): string {
    let normalized = shopDomain.toLowerCase().trim();

    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/\/$/, '');

    if (!normalized.endsWith('.myshopify.com')) {
      normalized = `${normalized}.myshopify.com`;
    }

    return normalized;
  }

  private isValidShopDomain(shopDomain: string): boolean {
    const shopDomainPattern = /^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/i;
    return shopDomainPattern.test(shopDomain);
  }

  getAuthHeaders(credentials: IShopifyCredentials): Record<string, string> {
    return {
      'X-Shopify-Access-Token': credentials.accessToken,
      'Content-Type': 'application/json',
    };
  }

  verifyWebhookSignature(
    body: string,
    hmacHeader: string,
    secret: string,
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    return hash === hmacHeader;
  }
}
