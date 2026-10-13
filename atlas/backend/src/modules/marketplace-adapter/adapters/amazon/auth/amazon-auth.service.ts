import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigurationService } from '@config/configuration.service';
import {
  IAmazonCredentials,
  IAmazonTokenResponse,
} from '../interfaces/amazon.interfaces';
import {
  AMAZON_AUTH_ENDPOINT,
  AMAZON_TOKEN_EXPIRY_BUFFER,
} from '../constants/amazon.constants';
import { AmazonAuthFailureClass, classifyAmazonAuthFailure } from './amazon-auth-error.classifier';

/** Carries a safe (secret-free) classification alongside the failure, so callers can distinguish a temporary Amazon outage from a revoked seller authorization without re-parsing the error. */
export class AmazonAuthError extends Error {
  constructor(
    message: string,
    public readonly classification: AmazonAuthFailureClass,
  ) {
    super(message);
    this.name = 'AmazonAuthError';
  }
}

@Injectable()
export class AmazonAuthService {
  private readonly logger = new Logger(AmazonAuthService.name);
  private tokenCache: Map<string, IAmazonTokenResponse> = new Map();

  constructor(private readonly configurationService: ConfigurationService) {}

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
    // clientId/clientSecret come ONLY from global ConfigurationService —
    // never from the per-seller `credentials` object, regardless of what
    // it contains, so a stale/wrong per-account value can never reach Amazon.
    // `credentials.app` only selects WHICH global app (default vs sandbox).
    const { clientId, clientSecret } = this.resolveLwaClient(credentials);

    try {
      const response = await axios.post(
        AMAZON_AUTH_ENDPOINT,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
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
      // classifyAmazonAuthFailure() only ever reads the HTTP status and
      // Amazon's own response body — never the outgoing request, which is
      // where client_id/client_secret/refresh_token are sent — so this is
      // safe to log in full.
      const { classification, reason, httpStatus, amazonErrorCode } = classifyAmazonAuthFailure(error, AMAZON_AUTH_ENDPOINT);
      this.logger.error(`Failed to refresh Amazon access token (${classification}): ${reason}`, { httpStatus, amazonErrorCode });
      throw new AmazonAuthError(`Amazon token refresh failed: ${reason}`, classification);
    }
  }

  /**
   * Exchanges a one-time `spapi_oauth_code` (from the Amazon OAuth consent
   * callback) for tokens — the authorization_code grant, distinct from the
   * refresh_token grant `refreshAccessToken()` uses for ongoing API calls.
   * clientId/clientSecret come only from global ConfigurationService, same
   * guarantee as refreshAccessToken().
   */
  async exchangeAuthorizationCode(code: string): Promise<IAmazonTokenResponse> {
    const { clientId, clientSecret } = this.configurationService.getAmazonProviderConfig();
    if (!clientId || !clientSecret) {
      throw new Error(
        'Amazon SP-API is not configured: AMAZON_SP_API_CLIENT_ID and AMAZON_SP_API_CLIENT_SECRET must both be set.',
      );
    }

    try {
      const response = await axios.post(
        AMAZON_AUTH_ENDPOINT,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const data = response.data;
      if (!data.refresh_token) {
        throw new Error('Amazon token response did not include a refresh_token');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (error) {
      const { classification, reason, httpStatus, amazonErrorCode } = classifyAmazonAuthFailure(error, AMAZON_AUTH_ENDPOINT);
      this.logger.error(`Failed to exchange Amazon authorization code (${classification}): ${reason}`, { httpStatus, amazonErrorCode });
      throw new AmazonAuthError(`Amazon authorization code exchange failed: ${reason}`, classification);
    }
  }

  private isTokenValid(token: IAmazonTokenResponse): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime() - AMAZON_TOKEN_EXPIRY_BUFFER;
    return now < expiryTime;
  }

  private getCacheKey(credentials: IAmazonCredentials): string {
    // App prefix keeps a sandbox token from ever being served to a seller
    // (both can have an empty sellerId on the same marketplace).
    return `${credentials.app ?? 'default'}:${credentials.sellerId}:${credentials.marketplace}`;
  }

  /** Production/default LWA app, or the dedicated sandbox app for sandbox-health credentials. */
  private resolveLwaClient(credentials: IAmazonCredentials): { clientId: string; clientSecret: string } {
    const global = this.configurationService.getAmazonProviderConfig();
    if (credentials.app === 'sandbox') {
      if (!global.sandboxClientId || !global.sandboxClientSecret) {
        throw new Error(
          'Amazon SP-API sandbox app is not configured: AMAZON_SP_API_SANDBOX_CLIENT_ID and AMAZON_SP_API_SANDBOX_CLIENT_SECRET must both be set.',
        );
      }
      return { clientId: global.sandboxClientId, clientSecret: global.sandboxClientSecret };
    }
    if (!global.clientId || !global.clientSecret) {
      throw new Error(
        'Amazon SP-API is not configured: AMAZON_SP_API_CLIENT_ID and AMAZON_SP_API_CLIENT_SECRET must both be set.',
      );
    }
    return { clientId: global.clientId, clientSecret: global.clientSecret };
  }

  clearCache(credentials: IAmazonCredentials): void {
    const cacheKey = this.getCacheKey(credentials);
    this.tokenCache.delete(cacheKey);
  }

  clearAllCache(): void {
    this.tokenCache.clear();
  }
}
