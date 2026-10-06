import { Injectable, Logger } from '@nestjs/common';
import { AdapterHttpClient } from '../../../client/http.client';
import { FlipkartAuthService } from '../auth/flipkart-auth.service';
import { IFlipkartCredentials } from '../interfaces/flipkart.interfaces';
import {
  FLIPKART_API_BASE_URL,
  FLIPKART_TIMEOUT,
  FLIPKART_MAX_RETRIES,
  FLIPKART_RETRY_DELAY,
} from '../constants/flipkart.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class FlipkartApiClient {
  private readonly logger = new Logger(FlipkartApiClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: FlipkartAuthService,
  ) {}

  async request<T = any>(
    credentials: IFlipkartCredentials,
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
      url: `${FLIPKART_API_BASE_URL}${path}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      params: this.sanitizeParams(params),
      data,
      timeout: FLIPKART_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: FLIPKART_MAX_RETRIES,
      retryDelay: FLIPKART_RETRY_DELAY,
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
      this.logger.error(`Flipkart API request failed: ${path}`, error);
      throw error;
    }
  }

  async get<T = any>(
    credentials: IFlipkartCredentials,
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
    credentials: IFlipkartCredentials,
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
    credentials: IFlipkartCredentials,
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

  async patch<T = any>(
    credentials: IFlipkartCredentials,
    path: string,
    data?: any,
    params?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>(
      credentials,
      HttpMethod.PATCH,
      path,
      params,
      data,
      throttleConfig,
      enableTracing,
    );
  }

  async delete<T = any>(
    credentials: IFlipkartCredentials,
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
          sanitized[key] = value;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }
}
