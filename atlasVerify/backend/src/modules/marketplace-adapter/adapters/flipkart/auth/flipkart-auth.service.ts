import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IFlipkartCredentials,
  IFlipkartTokenResponse,
} from '../interfaces/flipkart.interfaces';
import {
  FLIPKART_API_BASE_URL,
  FLIPKART_AUTH_ENDPOINT,
  FLIPKART_TOKEN_EXPIRY_BUFFER,
} from '../constants/flipkart.constants';

@Injectable()
export class FlipkartAuthService {
  private readonly logger = new Logger(FlipkartAuthService.name);
  private tokenCache: Map<string, IFlipkartTokenResponse> = new Map();

  async getAccessToken(credentials: IFlipkartCredentials): Promise<string> {
    if (credentials.accessToken) {
      return credentials.accessToken;
    }

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
    credentials: IFlipkartCredentials,
  ): Promise<IFlipkartTokenResponse> {
    try {
      const auth = Buffer.from(
        `${credentials.appId}:${credentials.appSecret}`,
      ).toString('base64');

      const response = await axios.post(
        `${FLIPKART_API_BASE_URL}${FLIPKART_AUTH_ENDPOINT}`,
        'grant_type=client_credentials&scope=Seller_Api',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
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
      this.logger.error('Failed to generate Flipkart access token', error);
      throw new Error('Flipkart token generation failed: ' + error.message);
    }
  }

  private isTokenValid(token: IFlipkartTokenResponse): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime() - FLIPKART_TOKEN_EXPIRY_BUFFER;
    return now < expiryTime;
  }

  private getCacheKey(credentials: IFlipkartCredentials): string {
    return `${credentials.sellerId}:${credentials.appId}`;
  }

  clearCache(credentials: IFlipkartCredentials): void {
    const cacheKey = this.getCacheKey(credentials);
    this.tokenCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.tokenCache.clear();
  }
}
