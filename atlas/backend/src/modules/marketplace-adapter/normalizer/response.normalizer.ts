import { Injectable } from '@nestjs/common';
import {
  IAdapterResponse,
  IHttpResponse,
  IPaginationMetadata,
  IRateLimitInfo,
} from '../interfaces';

@Injectable()
export class ResponseNormalizer {
  normalize<T>(
    httpResponse: IHttpResponse<any>,
    requestId: string,
    startTime: Date,
    attempts: number,
  ): IAdapterResponse<T> {
    const duration = Date.now() - startTime.getTime();

    return {
      success: this.isSuccessStatus(httpResponse.status),
      data: httpResponse.data,
      pagination: this.extractPagination(httpResponse),
      rateLimit: this.extractRateLimit(httpResponse),
      metadata: {
        requestId,
        duration,
        attempts,
        timestamp: new Date(),
      },
    };
  }

  normalizeError(
    error: any,
    requestId: string,
    startTime: Date,
    attempts: number,
  ): IAdapterResponse {
    const duration = Date.now() - startTime.getTime();

    return {
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        providerCode: error.response?.data?.code,
        providerMessage: error.response?.data?.message,
        statusCode: error.response?.status,
        retryable: this.isRetryableError(error),
        metadata: error.response?.data,
      },
      metadata: {
        requestId,
        duration,
        attempts,
        timestamp: new Date(),
      },
    };
  }

  private isSuccessStatus(status: number): boolean {
    return status >= 200 && status < 300;
  }

  private isRetryableError(error: any): boolean {
    const statusCode = error.response?.status;
    return statusCode === 429 || statusCode >= 500;
  }

  private extractPagination(
    httpResponse: IHttpResponse,
  ): IPaginationMetadata | undefined {
    const data = httpResponse.data;
    const headers = httpResponse.headers;

    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const pagination: IPaginationMetadata = {};

    if ('total' in data || 'totalCount' in data) {
      pagination.totalCount = data.total || data.totalCount;
    }

    if ('totalPages' in data) {
      pagination.totalPages = data.totalPages;
    }

    if ('page' in data || 'currentPage' in data) {
      pagination.currentPage = data.page || data.currentPage;
    }

    if ('limit' in data || 'pageSize' in data || 'perPage' in data) {
      pagination.pageSize = data.limit || data.pageSize || data.perPage;
    }

    if ('hasNext' in data || 'hasNextPage' in data) {
      pagination.hasNextPage = data.hasNext || data.hasNextPage;
    }

    if ('hasPrevious' in data || 'hasPreviousPage' in data) {
      pagination.hasPreviousPage = data.hasPrevious || data.hasPreviousPage;
    }

    if ('nextCursor' in data || 'next' in data) {
      pagination.nextCursor = data.nextCursor || data.next;
    }

    if ('previousCursor' in data || 'previous' in data) {
      pagination.previousCursor = data.previousCursor || data.previous;
    }

    if (headers['x-total-count']) {
      pagination.totalCount = parseInt(headers['x-total-count'], 10);
    }

    if (Object.keys(pagination).length === 0) {
      return undefined;
    }

    return pagination;
  }

  private extractRateLimit(
    httpResponse: IHttpResponse,
  ): IRateLimitInfo | undefined {
    const headers = httpResponse.headers;

    const limit = this.parseRateLimitHeader(
      headers['x-rate-limit-limit'] ||
        headers['x-ratelimit-limit'] ||
        headers['ratelimit-limit'],
    );

    const remaining = this.parseRateLimitHeader(
      headers['x-rate-limit-remaining'] ||
        headers['x-ratelimit-remaining'] ||
        headers['ratelimit-remaining'],
    );

    const resetTimestamp = this.parseRateLimitHeader(
      headers['x-rate-limit-reset'] ||
        headers['x-ratelimit-reset'] ||
        headers['ratelimit-reset'],
    );

    const retryAfter = this.parseRateLimitHeader(
      headers['retry-after'] || headers['x-retry-after'],
    );

    if (limit === undefined && remaining === undefined) {
      return undefined;
    }

    return {
      limit: limit ?? 0,
      remaining: remaining ?? 0,
      reset: resetTimestamp
        ? new Date(resetTimestamp * 1000)
        : new Date(Date.now() + 60000),
      retryAfter,
    };
  }

  private parseRateLimitHeader(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
}
