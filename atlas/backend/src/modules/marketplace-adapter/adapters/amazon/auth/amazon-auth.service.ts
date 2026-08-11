import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IAmazonCredentials,
  IAmazonTokenResponse,
} from '../interfaces/amazon.interfaces';
import {
  AMAZON_AUTH_ENDPOINT,
  AMAZON_TOKEN_EXPIRY_BUFFER,
} from '../constants/amazon.constants';

@Injectable()
export class AmazonAuthService {
  private readonly logger = new Logger(AmazonAuthService.name);
  private tokenCache: Map<string, IAmazonTokenResponse> = new Map();

  async getAccessToken(credentials: IAmazonCredentials): Promise<string> {
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
    credentials: IAmazonCredentials,
  ): Promise<IAmazonTokenResponse> {
    try {
      const response = await axios.post(
        AMAZON_AUTH_ENDPOINT,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || credentials.refreshToken,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to refresh Amazon access token', error);
      throw new Error('Amazon token refresh failed: ' + error.message);
    }
  }

  private isTokenValid(token: IAmazonTokenResponse): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime() - AMAZON_TOKEN_EXPIRY_BUFFER;
    return now < expiryTime;
  }

  private getCacheKey(credentials: IAmazonCredentials): string {
    return `${credentials.sellerId}:${credentials.marketplace}`;
  }

  clearCache(credentials: IAmazonCredentials): void {
    const cacheKey = this.getCacheKey(credentials);
    this.tokenCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.tokenCache.clear();
  }
}
