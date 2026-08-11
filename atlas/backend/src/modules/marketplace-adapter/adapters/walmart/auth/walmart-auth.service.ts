import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IWalmartCredentials,
  IWalmartTokenResponse,
} from '../interfaces/walmart.interfaces';
import {
  WALMART_AUTH_ENDPOINT,
  WALMART_TOKEN_EXPIRY_BUFFER,
} from '../constants/walmart.constants';

@Injectable()
export class WalmartAuthService {
  private readonly logger = new Logger(WalmartAuthService.name);
  private tokenCache: Map<string, IWalmartTokenResponse> = new Map();

  async getAccessToken(credentials: IWalmartCredentials): Promise<string> {
    const cacheKey = this.getCacheKey(credentials);
    const cached = this.tokenCache.get(cacheKey);

    if (cached && this.isTokenValid(cached)) {
      return cached.accessToken;
    }

    const tokenResponse = await this.generateAccessToken(credentials);
    this.tokenCache.set(cacheKey, tokenResponse);

    return tokenResponse.accessToken;
  }

  async generateAccessToken(
    credentials: IWalmartCredentials,
  ): Promise<IWalmartTokenResponse> {
    try {
      const auth = Buffer.from(
        `${credentials.clientId}:${credentials.clientSecret}`,
      ).toString('base64');

      const response = await axios.post(
        WALMART_AUTH_ENDPOINT,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
          },
        },
      );

      const data = response.data;

      return {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to generate Walmart access token', error);
      throw new Error('Walmart token generation failed: ' + error.message);
    }
  }

  private isTokenValid(token: IWalmartTokenResponse): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime() - WALMART_TOKEN_EXPIRY_BUFFER;
    return now < expiryTime;
  }

  private getCacheKey(credentials: IWalmartCredentials): string {
    return `${credentials.clientId}`;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  clearCache(credentials: IWalmartCredentials): void {
    const cacheKey = this.getCacheKey(credentials);
    this.tokenCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.tokenCache.clear();
  }

  generateAuthHeaders(
    credentials: IWalmartCredentials,
    accessToken: string,
  ): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_SVC.NAME': 'Walmart Marketplace',
      'WM_QOS.CORRELATION_ID': this.generateCorrelationId(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
