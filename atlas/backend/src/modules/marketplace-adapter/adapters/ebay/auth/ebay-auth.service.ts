import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IEbayCredentials,
  IEbayTokenResponse,
} from '../interfaces/ebay.interfaces';
import {
  EBAY_AUTH_ENDPOINT,
  EBAY_TOKEN_EXPIRY_BUFFER,
  EBAY_OAUTH_SCOPES,
} from '../constants/ebay.constants';

@Injectable()
export class EbayAuthService {
  private readonly logger = new Logger(EbayAuthService.name);
  private tokenCache: Map<string, IEbayTokenResponse> = new Map();

  async getAccessToken(credentials: IEbayCredentials): Promise<string> {
    const cacheKey = this.getCacheKey(credentials);
    const cached = this.tokenCache.get(cacheKey);

    if (cached && this.isTokenValid(cached)) {
      return cached.accessToken;
    }

    const tokenResponse = await this.refreshAccessToken(credentials);
    this.tokenCache.set(cacheKey, tokenResponse);

    return tokenResponse.accessToken;
  }

  async refreshAccessToken(
    credentials: IEbayCredentials,
  ): Promise<IEbayTokenResponse> {
    try {
      const auth = Buffer.from(
        `${credentials.clientId}:${credentials.clientSecret}`,
      ).toString('base64');

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', credentials.refreshToken);
      params.append('scope', EBAY_OAUTH_SCOPES.join(' '));

      const response = await axios.post(EBAY_AUTH_ENDPOINT, params.toString(), {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = response.data;

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        refreshToken: credentials.refreshToken,
      };
    } catch (error) {
      this.logger.error('Failed to refresh eBay access token', error);
      throw new Error('eBay token refresh failed: ' + error.message);
    }
  }

  private isTokenValid(token: IEbayTokenResponse): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime() - EBAY_TOKEN_EXPIRY_BUFFER;
    return now < expiryTime;
  }

  private getCacheKey(credentials: IEbayCredentials): string {
    return `${credentials.clientId}:${credentials.refreshToken}`;
  }

  clearCache(credentials: IEbayCredentials): void {
    const cacheKey = this.getCacheKey(credentials);
    this.tokenCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.tokenCache.clear();
  }

  generateAuthHeaders(
    credentials: IEbayCredentials,
    accessToken: string,
    contentLanguage?: string,
    marketplaceId?: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (contentLanguage) {
      headers['Content-Language'] = contentLanguage;
    }

    if (marketplaceId) {
      headers['X-EBAY-C-MARKETPLACE-ID'] = marketplaceId;
    }

    return headers;
  }

  async validateCredentials(credentials: IEbayCredentials): Promise<boolean> {
    try {
      await this.getAccessToken(credentials);
      return true;
    } catch (error) {
      this.logger.error('eBay credentials validation failed', error);
      return false;
    }
  }
}
