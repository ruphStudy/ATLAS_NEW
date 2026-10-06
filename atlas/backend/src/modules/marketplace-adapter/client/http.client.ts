import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  IHttpRequest,
  IHttpResponse,
  IRetryConfig,
  IThrottleConfig,
  IRequestTrace,
  IAdapterError,
} from '../interfaces';

@Injectable()
export class AdapterHttpClient {
  private readonly logger = new Logger(AdapterHttpClient.name);
  private axiosInstance: AxiosInstance;
  private requestCounts: Map<string, { count: number; resetAt: number }> =
    new Map();

  constructor() {
    this.axiosInstance = axios.create();
  }

  async request<T = any>(
    request: IHttpRequest,
    retryConfig?: IRetryConfig,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<T>> {
    const trace: IRequestTrace = {
      requestId: this.generateRequestId(),
      method: request.method,
      url: request.url,
      startTime: new Date(),
      attempts: 0,
    };

    if (throttleConfig) {
      await this.applyThrottle(request.url, throttleConfig);
    }

    const maxRetries = retryConfig?.maxRetries ?? 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      trace.attempts = attempt + 1;

      try {
        const response = await this.executeRequest<T>(request);

        trace.endTime = new Date();
        trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
        trace.statusCode = response.status;

        if (enableTracing) {
          this.logger.debug(
            `Request trace: ${JSON.stringify(this.sanitizeTrace(trace))}`,
          );
        }

        return response;
      } catch (error) {
        lastError = error;
        trace.error = this.normalizeError(error);

        if (!this.shouldRetry(error, retryConfig, attempt, maxRetries)) {
          break;
        }

        const delay = this.calculateRetryDelay(
          attempt,
          retryConfig?.retryDelay ?? 1000,
          retryConfig?.backoffMultiplier ?? 2,
        );

        this.logger.warn(
          `Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );

        await this.delay(delay);
      }
    }

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();

    if (enableTracing) {
      this.logger.error(
        `Request failed after ${trace.attempts} attempts: ${JSON.stringify(this.sanitizeTrace(trace))}`,
      );
    }

    throw lastError;
  }

  private async executeRequest<T>(
    request: IHttpRequest,
  ): Promise<IHttpResponse<T>> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      data: request.data,
      timeout: request.timeout ?? 30000,
    };

    const response: AxiosResponse<T> = await this.axiosInstance.request(config);

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
      data: response.data,
    };
  }

  /**
   * Normalizes either `IThrottleConfig` shape to the fixed-window form this method operates on.
   * For `{ rate, burst }`, the window is sized so that allowing `burst` requests across it
   * reproduces the same steady-state `rate` (requests/sec): `windowMs = (burst / rate) * 1000`.
   */
  private resolveThrottleWindow(
    config: IThrottleConfig,
  ): { maxRequests: number; windowMs: number } {
    if ('maxRequests' in config) {
      return config;
    }

    return {
      maxRequests: config.burst,
      windowMs: (config.burst / config.rate) * 1000,
    };
  }

  private async applyThrottle(
    url: string,
    config: IThrottleConfig,
  ): Promise<void> {
    const { maxRequests, windowMs } = this.resolveThrottleWindow(config);
    const now = Date.now();
    const key = this.getThrottleKey(url);
    const entry = this.requestCounts.get(key);

    if (!entry || now > entry.resetAt) {
      this.requestCounts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return;
    }

    if (entry.count >= maxRequests) {
      const waitTime = entry.resetAt - now;
      this.logger.warn(`Rate limit reached, waiting ${waitTime}ms`);
      await this.delay(waitTime);
      this.requestCounts.delete(key);
      await this.applyThrottle(url, config);
      return;
    }

    entry.count++;
  }

  private getThrottleKey(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  private shouldRetry(
    error: any,
    retryConfig: IRetryConfig | undefined,
    attempt: number,
    maxRetries: number,
  ): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    const statusCode = error.response?.status;
    const errorCode = error.code;

    const retryableStatusCodes = retryConfig?.retryableStatusCodes ?? [
      408, 429, 500, 502, 503, 504,
    ];

    const retryableErrors = retryConfig?.retryableErrors ?? [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
    ];

    if (statusCode && retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    if (errorCode && retryableErrors.includes(errorCode)) {
      return true;
    }

    return false;
  }

  private calculateRetryDelay(
    attempt: number,
    baseDelay: number,
    multiplier: number,
  ): number {
    return baseDelay * Math.pow(multiplier, attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeError(error: any): IAdapterError {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      statusCode: error.response?.status,
      providerCode: error.response?.data?.code,
      providerMessage: error.response?.data?.message,
      retryable: this.isRetryableError(error),
    };
  }

  private isRetryableError(error: any): boolean {
    const statusCode = error.response?.status;
    return statusCode === 429 || statusCode >= 500;
  }

  private sanitizeTrace(trace: IRequestTrace): Partial<IRequestTrace> {
    return {
      requestId: trace.requestId,
      method: trace.method,
      url: this.sanitizeUrl(trace.url),
      duration: trace.duration,
      statusCode: trace.statusCode,
      attempts: trace.attempts,
      error: trace.error
        ? {
            code: trace.error.code,
            message: trace.error.message,
            statusCode: trace.error.statusCode,
          }
        : undefined,
    };
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
