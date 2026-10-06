import { Injectable, Logger } from '@nestjs/common';
import { AdapterHttpClient } from '../../../client/http.client';
import { WalmartAuthService } from '../auth/walmart-auth.service';
import { IWalmartCredentials } from '../interfaces/walmart.interfaces';
import {
  WALMART_API_BASE_URL,
  WALMART_TIMEOUT,
  WALMART_MAX_RETRIES,
  WALMART_RETRY_DELAY,
} from '../constants/walmart.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class WalmartApiClient {
  private readonly logger = new Logger(WalmartApiClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: WalmartAuthService,
  ) {}

  async request<T = any>(
    credentials: IWalmartCredentials,
    method: HttpMethod,
    path: string,
    params?: Record<string, any>,
    data?: any,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    const accessToken = await this.authService.getAccessToken(credentials);

    const request: IHttpRequest = {
      method,
      url: `${WALMART_API_BASE_URL}${path}`,
      headers: this.authService.generateAuthHeaders(credentials, accessToken),
      params: this.sanitizeParams(params),
      data,
      timeout: WALMART_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: WALMART_MAX_RETRIES,
      retryDelay: WALMART_RETRY_DELAY,
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
      this.logger.error(`Walmart API request failed: ${path}`, error);
      throw error;
    }
  }

  async get<T = any>(
    credentials: IWalmartCredentials,
    path: string,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.GET,
      path,
      params,
      undefined,
      throttleConfig,
      enableTracing,
    );
  }

  async post<T = any>(
    credentials: IWalmartCredentials,
    path: string,
    data?: any,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.POST,
      path,
      params,
      data,
      throttleConfig,
      enableTracing,
    );
  }

  async put<T = any>(
    credentials: IWalmartCredentials,
    path: string,
    data?: any,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.PUT,
      path,
      params,
      data,
      throttleConfig,
      enableTracing,
    );
  }

  async delete<T = any>(
    credentials: IWalmartCredentials,
    path: string,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.DELETE,
      path,
      params,
      undefined,
      throttleConfig,
      enableTracing,
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
