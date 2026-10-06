import { Injectable, Logger } from '@nestjs/common';
import { sanitizeErrorForLog } from '@common/utils';
import { AdapterHttpClient } from '../../../client/http.client';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import {
  IAmazonCredentials,
  AmazonRegion,
} from '../interfaces/amazon.interfaces';
import {
  AMAZON_SP_API_ENDPOINTS,
  AMAZON_MARKETPLACE_REGIONS,
  AMAZON_TIMEOUT,
  AMAZON_MAX_RETRIES,
  AMAZON_RETRY_DELAY,
} from '../constants/amazon.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class AmazonSpApiClient {
  private readonly logger = new Logger(AmazonSpApiClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: AmazonAuthService,
  ) {}

  async request<T = any>(
    credentials: IAmazonCredentials,
    method: HttpMethod,
    path: string,
    params?: Record<string, any>,
    data?: any,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    const accessToken = await this.authService.getAccessToken(credentials);
    const region = this.getRegion(credentials);
    const baseUrl = AMAZON_SP_API_ENDPOINTS[region];

    const request: IHttpRequest = {
      method,
      url: `${baseUrl}${path}`,
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
      params: this.sanitizeParams(params),
      data,
      timeout: AMAZON_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: AMAZON_MAX_RETRIES,
      retryDelay: AMAZON_RETRY_DELAY,
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
      this.logger.error(`Amazon SP-API request failed: ${path}`, sanitizeErrorForLog(error));
      throw error;
    }
  }

  async get<T = any>(
    credentials: IAmazonCredentials,
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
    credentials: IAmazonCredentials,
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
    credentials: IAmazonCredentials,
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
    credentials: IAmazonCredentials,
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
    credentials: IAmazonCredentials,
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

  private getRegion(credentials: IAmazonCredentials): AmazonRegion {
    return (
      AMAZON_MARKETPLACE_REGIONS[credentials.marketplace] || AmazonRegion.NA
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
