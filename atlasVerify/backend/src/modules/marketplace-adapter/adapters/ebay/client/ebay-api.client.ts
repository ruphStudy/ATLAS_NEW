import { Injectable, Logger } from '@nestjs/common';
import { AdapterHttpClient } from '../../../client/http.client';
import { EbayAuthService } from '../auth/ebay-auth.service';
import { IEbayCredentials } from '../interfaces/ebay.interfaces';
import {
  EBAY_API_BASE_URL,
  EBAY_TIMEOUT,
  EBAY_MAX_RETRIES,
  EBAY_RETRY_DELAY,
} from '../constants/ebay.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class EbayApiClient {
  private readonly logger = new Logger(EbayApiClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: EbayAuthService,
  ) {}

  async request<T = any>(
    credentials: IEbayCredentials,
    method: HttpMethod,
    path: string,
    params?: Record<string, any>,
    data?: any,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
    marketplaceId?: string,
    contentLanguage?: string,
  ): Promise<IHttpResponse<T>> {
    const accessToken = await this.authService.getAccessToken(credentials);

    const request: IHttpRequest = {
      method,
      url: `${EBAY_API_BASE_URL}${path}`,
      headers: this.authService.generateAuthHeaders(
        credentials,
        accessToken,
        contentLanguage,
        marketplaceId,
      ),
      params: this.sanitizeParams(params),
      data,
      timeout: EBAY_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: EBAY_MAX_RETRIES,
      retryDelay: EBAY_RETRY_DELAY,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      backoffMultiplier: 2,
    };

    try {
      return await this.httpClient.request<T>(
        request,
        retryConfig,
        throttleConfig,
        enableTracing,
      );
    } catch (error) {
      this.logger.error(`eBay API request failed: ${path}`, error);
      throw error;
    }
  }

  async get<T = any>(
    credentials: IEbayCredentials,
    path: string,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
    marketplaceId?: string,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.GET,
      path,
      params,
      undefined,
      throttleConfig,
      enableTracing,
      marketplaceId,
    );
  }

  async post<T = any>(
    credentials: IEbayCredentials,
    path: string,
    data?: any,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
    marketplaceId?: string,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.POST,
      path,
      params,
      data,
      throttleConfig,
      enableTracing,
      marketplaceId,
    );
  }

  async put<T = any>(
    credentials: IEbayCredentials,
    path: string,
    data?: any,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
    marketplaceId?: string,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.PUT,
      path,
      params,
      data,
      throttleConfig,
      enableTracing,
      marketplaceId,
    );
  }

  async delete<T = any>(
    credentials: IEbayCredentials,
    path: string,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
    marketplaceId?: string,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.DELETE,
      path,
      params,
      undefined,
      throttleConfig,
      enableTracing,
      marketplaceId,
    );
  }

  private sanitizeParams(
    params?: Record<string, any>,
  ): Record<string, any> | undefined {
    if (!params) {
      return undefined;
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          sanitized[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          sanitized[key] = value.join(',');
        } else {
          sanitized[key] = value;
        }
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}
