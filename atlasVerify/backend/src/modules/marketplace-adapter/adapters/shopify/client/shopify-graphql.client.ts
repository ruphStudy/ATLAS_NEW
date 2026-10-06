import { Injectable, Logger } from '@nestjs/common';
import { AdapterHttpClient } from '../../../client/http.client';
import { ShopifyAuthService } from '../auth/shopify-auth.service';
import { IShopifyCredentials, IShopifyGraphQLResponse } from '../interfaces/shopify.interfaces';
import {
  SHOPIFY_GRAPHQL_ENDPOINT,
  SHOPIFY_API_VERSION,
  SHOPIFY_TIMEOUT,
  SHOPIFY_MAX_RETRIES,
  SHOPIFY_RETRY_DELAY,
} from '../constants/shopify.constants';
import {
  IHttpRequest,
  IHttpResponse,
  HttpMethod,
  IRetryConfig,
  IThrottleConfig,
} from '../../../interfaces';

@Injectable()
export class ShopifyGraphQLClient {
  private readonly logger = new Logger(ShopifyGraphQLClient.name);

  constructor(
    private readonly httpClient: AdapterHttpClient,
    private readonly authService: ShopifyAuthService,
  ) {}

  async query<T = any>(
    credentials: IShopifyCredentials,
    query: string,
    variables?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<IShopifyGraphQLResponse<T>>> {
    this.authService.validateCredentials(credentials);

    const shopDomain = this.authService.normalizeShopDomain(
      credentials.shopDomain,
    );
    const apiVersion = credentials.apiVersion || SHOPIFY_API_VERSION;

    const request: IHttpRequest = {
      method: HttpMethod.POST,
      url: SHOPIFY_GRAPHQL_ENDPOINT(shopDomain, apiVersion),
      headers: this.authService.getAuthHeaders(credentials),
      data: {
        query,
        variables,
      },
      timeout: SHOPIFY_TIMEOUT,
    };

    const retryConfig: IRetryConfig = {
      maxRetries: SHOPIFY_MAX_RETRIES,
      retryDelay: SHOPIFY_RETRY_DELAY,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      backoffMultiplier: 2,
    };

    try {
      const response = await this.httpClient.request<IShopifyGraphQLResponse<T>>(
        request,
        retryConfig,
        throttleConfig,
        enableTracing,
      );

      if (response.data?.errors && response.data.errors.length > 0) {
        this.logger.warn(
          `GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        );
      }

      return response;
    } catch (error) {
      this.logger.error('Shopify GraphQL request failed', error);
      throw error;
    }
  }

  async mutate<T = any>(
    credentials: IShopifyCredentials,
    mutation: string,
    variables?: Record<string, any>,
    throttleConfig?: IThrottleConfig,
    enableTracing?: boolean,
  ): Promise<IHttpResponse<IShopifyGraphQLResponse<T>>> {
    return this.query<T>(
      credentials,
      mutation,
      variables,
      throttleConfig,
      enableTracing,
    );
  }

  extractData<T>(response: IShopifyGraphQLResponse<T>): T {
    if (response.errors && response.errors.length > 0) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`);
    }

    if (!response.data) {
      throw new Error('No data in GraphQL response');
    }

    return response.data;
  }

  extractCost(response: IShopifyGraphQLResponse): {
    requestedQueryCost: number;
    actualQueryCost: number;
    throttleStatus?: {
      maximumAvailable: number;
      currentlyAvailable: number;
      restoreRate: number;
    };
  } | undefined {
    return response.extensions?.cost;
  }
}
