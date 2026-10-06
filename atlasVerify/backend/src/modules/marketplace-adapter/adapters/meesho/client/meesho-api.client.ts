import { Injectable, Logger } from '@nestjs/common';
import { AdapterHttpClient } from '../../../client/http.client';
import { MeeshoAuthService } from '../auth/meesho-auth.service';
import { IMeeshoCredentials } from '../interfaces/meesho.interfaces';
import {
  MEESHO_API_BASE_URL,
  MEESHO_TIMEOUT,
  MEESHO_MAX_RETRIES,
  MEESHO_RETRY_DELAY,
} from '../constants/meesho.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class MeeshoApiClient {
  private readonly logger = new Logger(MeeshoApiClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: MeeshoAuthService,
  ) {}

  async request<T = any>(
    credentials: IMeeshoCredentials,
    method: HttpMethod,
    path: string,
    params?: Record<string, any>,
    data?: any,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    const request: IHttpRequest = {
      method,
      url: `${MEESHO_API_BASE_URL}${path}`,
      headers: this.authService.generateAuthHeaders(credentials),
      params: this.sanitizeParams(params),
      data,
      timeout: MEESHO_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: MEESHO_MAX_RETRIES,
      retryDelay: MEESHO_RETRY_DELAY,
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
      this.logger.error(`Meesho API request failed: ${path}`, error);
      throw error;
    }
  }

  async get<T = any>(
    credentials: IMeeshoCredentials,
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
    credentials: IMeeshoCredentials,
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
    credentials: IMeeshoCredentials,
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
    credentials: IMeeshoCredentials,
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
    credentials: IMeeshoCredentials,
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
