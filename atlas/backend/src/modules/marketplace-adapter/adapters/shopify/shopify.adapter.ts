import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { ShopifyGraphQLClient } from '../client/shopify-graphql.client';
import { ShopifyAuthService } from '../auth/shopify-auth.service';
import { ShopifyRequestMapper } from '../mappers/shopify-request.mapper';
import { ShopifyResponseMapper } from '../mappers/shopify-response.mapper';
import { ShopifyErrorMapper } from '../mappers/shopify-error.mapper';
import { ShopifyAdapterEventQueue } from '../events/shopify-adapter-event.queue';
import { ResponseNormalizer } from '../../normalizer/response.normalizer';
import {
  IAdapterCapabilities,
  IRequestContext,
  IAdapterResponse,
  IPaginationParams,
  AdapterCapability,
  AdapterOperation,
  ApiVersion,
} from '../../interfaces';
import { IShopifyCredentials } from '../interfaces/shopify.interfaces';
import {
  SHOPIFY_API_VERSION,
  SHOPIFY_RATE_LIMITS,
  SHOPIFY_GRAPHQL_QUERIES,
  SHOPIFY_GRAPHQL_MUTATIONS,
} from '../constants/shopify.constants';

@Injectable()
export class ShopifyAdapter extends BaseAdapter {
  private readonly logger = new Logger(ShopifyAdapter.name);
  private shopifyCredentials: IShopifyCredentials;

  constructor(
    private readonly graphqlClient: ShopifyGraphQLClient,
    private readonly authService: ShopifyAuthService,
    private readonly requestMapper: ShopifyRequestMapper,
    private readonly responseMapper: ShopifyResponseMapper,
    private readonly errorMapper: ShopifyErrorMapper,
    private readonly eventQueue: ShopifyAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.shopifyCredentials = {
      shopDomain: this.credentials.credentials.shopDomain,
      accessToken: this.credentials.credentials.accessToken,
      apiVersion: this.credentials.credentials.apiVersion || SHOPIFY_API_VERSION,
    };

    this.authService.validateCredentials(this.shopifyCredentials);

    this.logger.log(
      `Shopify adapter initialized for shop ${this.shopifyCredentials.shopDomain}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log(
      `Shopify adapter destroyed for shop ${this.shopifyCredentials.shopDomain}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'shopify',
      apiVersion: ApiVersion.V1,
      supportedCapabilities: [
        AdapterCapability.CATALOG_READ,
        AdapterCapability.CATALOG_WRITE,
        AdapterCapability.INVENTORY_READ,
        AdapterCapability.INVENTORY_WRITE,
        AdapterCapability.LISTING_READ,
        AdapterCapability.LISTING_WRITE,
        AdapterCapability.ORDER_READ,
        AdapterCapability.SHIPMENT_READ,
        AdapterCapability.SHIPMENT_WRITE,
        AdapterCapability.RETURN_READ,
        AdapterCapability.PRICING_READ,
        AdapterCapability.PRICING_WRITE,
        AdapterCapability.WEBHOOK_MANAGEMENT,
        AdapterCapability.BATCH_OPERATIONS,
      ],
      supportedOperations: [
        AdapterOperation.GET_CATALOG,
        AdapterOperation.UPDATE_CATALOG,
        AdapterOperation.GET_INVENTORY,
        AdapterOperation.UPDATE_INVENTORY,
        AdapterOperation.GET_LISTING,
        AdapterOperation.CREATE_LISTING,
        AdapterOperation.UPDATE_LISTING,
        AdapterOperation.DELETE_LISTING,
        AdapterOperation.GET_ORDER,
        AdapterOperation.GET_SHIPMENT,
        AdapterOperation.CREATE_SHIPMENT,
        AdapterOperation.GET_RETURN,
        AdapterOperation.GET_PRICING,
        AdapterOperation.UPDATE_PRICING,
        AdapterOperation.REGISTER_WEBHOOK,
        AdapterOperation.UNREGISTER_WEBHOOK,
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: SHOPIFY_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_LISTING]: SHOPIFY_RATE_LIMITS.PRODUCTS,
        [AdapterOperation.GET_INVENTORY]: SHOPIFY_RATE_LIMITS.INVENTORY,
        [AdapterOperation.GET_SHIPMENT]: SHOPIFY_RATE_LIMITS.FULFILLMENTS,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.graphqlClient.query(
      this.shopifyCredentials,
      SHOPIFY_GRAPHQL_QUERIES.SHOP,
      undefined,
      undefined,
      false,
    );

    const data = this.graphqlClient.extractData(response.data);

    return {
      connected: true,
      shop: data.shop,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.graphqlClient.query(
      this.shopifyCredentials,
      SHOPIFY_GRAPHQL_QUERIES.SHOP,
      undefined,
      undefined,
      false,
    );
  }

  async getCatalog(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_CATALOG,
      async () => {
        const variables = this.requestMapper.mapPagination(params);

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_QUERIES.PRODUCTS,
          variables,
          SHOPIFY_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        const data = this.graphqlClient.extractData(response.data);

        const items = data.products.edges.map((edge: any) =>
          this.responseMapper.mapProduct(edge.node),
        );

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(
              data.products.pageInfo,
            ),
          },
        };
      },
    );
  }

  async updateCatalog(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_CATALOG,
      async () => {
        const input = this.requestMapper.mapProductInput(data);

        const mutation = data.id
          ? SHOPIFY_GRAPHQL_MUTATIONS.UPDATE_PRODUCT
          : SHOPIFY_GRAPHQL_MUTATIONS.CREATE_PRODUCT;

        const response = await this.graphqlClient.mutate(
          this.shopifyCredentials,
          mutation,
          { input },
          SHOPIFY_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async getInventory(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_INVENTORY,
      async () => {
        const variables = this.requestMapper.mapPagination(params);

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_QUERIES.PRODUCTS,
          variables,
          SHOPIFY_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
        );

        const data = this.graphqlClient.extractData(response.data);

        const items = data.products.edges.flatMap((edge: any) =>
          edge.node.variants.edges.map((variantEdge: any) => ({
            sku: variantEdge.node.sku,
            inventoryQuantity: variantEdge.node.inventoryQuantity,
            inventoryItemId: variantEdge.node.inventoryItem?.id,
          })),
        );

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(
              data.products.pageInfo,
            ),
          },
        };
      },
    );
  }

  async updateInventory(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_INVENTORY,
      async () => {
        const input = this.requestMapper.mapInventoryUpdate(data);

        const response = await this.graphqlClient.mutate(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_MUTATIONS.UPDATE_INVENTORY,
          { input },
          SHOPIFY_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async getListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_LISTING,
      async () => {
        const gid = this.responseMapper.toGid('Product', listingId);

        const query = `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              descriptionHtml
              vendor
              productType
              createdAt
              updatedAt
              publishedAt
              status
              tags
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    sku
                    price
                    compareAtPrice
                    inventoryQuantity
                  }
                }
              }
            }
          }
        `;

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          query,
          { id: gid },
          SHOPIFY_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        const data = this.graphqlClient.extractData(response.data);
        const product = this.responseMapper.mapProduct(data.product);

        return {
          ...response,
          data: product,
        };
      },
    );
  }

  async createListing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.updateCatalog(context, data);
  }

  async updateListing(
    context: IRequestContext,
    listingId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.updateCatalog(context, { ...data, id: listingId });
  }

  async deleteListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.DELETE_LISTING,
      async () => {
        const gid = this.responseMapper.toGid('Product', listingId);

        const mutation = `
          mutation productDelete($input: ProductDeleteInput!) {
            productDelete(input: $input) {
              deletedProductId
              userErrors {
                field
                message
              }
            }
          }
        `;

        const response = await this.graphqlClient.mutate(
          this.shopifyCredentials,
          mutation,
          { input: { id: gid } },
          SHOPIFY_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async listListings(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.getCatalog(context, params);
  }

  async getOrder(
    context: IRequestContext,
    orderId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_ORDER,
      async () => {
        const gid = this.responseMapper.toGid('Order', orderId);

        const query = `
          query getOrder($id: ID!) {
            order(id: $id) {
              id
              name
              email
              createdAt
              updatedAt
              currencyCode
              currentTotalPriceSet {
                shopMoney {
                  amount
                }
              }
              displayFinancialStatus
              displayFulfillmentStatus
              customer {
                id
                email
                firstName
                lastName
              }
              lineItems(first: 250) {
                edges {
                  node {
                    id
                    title
                    sku
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          query,
          { id: gid },
          SHOPIFY_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const data = this.graphqlClient.extractData(response.data);
        const order = this.responseMapper.mapOrder(data.order);

        return {
          ...response,
          data: order,
        };
      },
    );
  }

  async updateOrder(
    context: IRequestContext,
    orderId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UPDATE_ORDER not directly supported by Shopify GraphQL API',
    );
  }

  async listOrders(
    context: IRequestContext,
    params?: IPaginationParams & { startDate?: Date; endDate?: Date },
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_ORDER,
      async () => {
        const variables = {
          ...this.requestMapper.mapPagination(params),
          query: this.requestMapper.mapOrderQuery({
            startDate: params?.startDate,
            endDate: params?.endDate,
          }),
        };

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_QUERIES.ORDERS,
          variables,
          SHOPIFY_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const data = this.graphqlClient.extractData(response.data);

        const orders = data.orders.edges.map((edge: any) =>
          this.responseMapper.mapOrder(edge.node),
        );

        return {
          ...response,
          data: {
            orders,
            pagination: this.responseMapper.mapPagination(
              data.orders.pageInfo,
            ),
          },
        };
      },
    );
  }

  async getShipment(
    context: IRequestContext,
    shipmentId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'GET_SHIPMENT by ID not supported - use order fulfillments',
    );
  }

  async createShipment(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.CREATE_SHIPMENT,
      async () => {
        const fulfillment = this.requestMapper.mapFulfillmentInput(data);

        const response = await this.graphqlClient.mutate(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_MUTATIONS.CREATE_FULFILLMENT,
          { fulfillment },
          SHOPIFY_RATE_LIMITS.FULFILLMENTS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async updateShipment(
    context: IRequestContext,
    shipmentId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UPDATE_SHIPMENT not supported by Shopify - create new fulfillment',
    );
  }

  async listShipments(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_SHIPMENTS not supported - query order fulfillments instead',
    );
  }

  async getReturn(
    context: IRequestContext,
    returnId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'GET_RETURN not directly supported - use refunds',
    );
  }

  async processReturn(
    context: IRequestContext,
    returnId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'PROCESS_RETURN not supported by Shopify GraphQL API',
    );
  }

  async listReturns(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_RETURNS not supported - use order refunds instead',
    );
  }

  async getPricing(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.getCatalog(context, params);
  }

  async updatePricing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.updateCatalog(context, data);
  }

  async getReport(
    context: IRequestContext,
    reportType: string,
    params?: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'GET_REPORT not supported - use Shopify Analytics API',
    );
  }

  async listReports(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_REPORTS not supported - use Shopify Analytics API',
    );
  }

  async registerWebhook(
    context: IRequestContext,
    data: { url: string; events: string[]; secret?: string },
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.REGISTER_WEBHOOK,
      async () => {
        const webhookSubscription = this.requestMapper.mapWebhookInput(data);

        const results = [];

        for (const topic of data.events) {
          const response = await this.graphqlClient.mutate(
            this.shopifyCredentials,
            SHOPIFY_GRAPHQL_MUTATIONS.WEBHOOK_SUBSCRIPTION_CREATE,
            {
              topic,
              webhookSubscription,
            },
            SHOPIFY_RATE_LIMITS.WEBHOOKS,
            this.config.enableTracing,
          );

          results.push(response.data);
        }

        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          data: { webhooks: results },
        };
      },
    );
  }

  async unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UNREGISTER_WEBHOOK,
      async () => {
        const gid = this.responseMapper.toGid('WebhookSubscription', webhookId);

        const response = await this.graphqlClient.mutate(
          this.shopifyCredentials,
          SHOPIFY_GRAPHQL_MUTATIONS.WEBHOOK_SUBSCRIPTION_DELETE,
          { id: gid },
          SHOPIFY_RATE_LIMITS.WEBHOOKS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.REGISTER_WEBHOOK,
      async () => {
        const query = `
          query {
            webhookSubscriptions(first: 250) {
              edges {
                node {
                  id
                  topic
                  endpoint {
                    __typename
                    ... on WebhookHttpEndpoint {
                      callbackUrl
                    }
                  }
                  createdAt
                  updatedAt
                }
              }
            }
          }
        `;

        const response = await this.graphqlClient.query(
          this.shopifyCredentials,
          query,
          undefined,
          SHOPIFY_RATE_LIMITS.WEBHOOKS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  private async executeOperation(
    context: IRequestContext,
    operation: AdapterOperation,
    fn: () => Promise<any>,
  ): Promise<IAdapterResponse> {
    const startTime = new Date();
    let attempts = 0;

    try {
      this.ensureInitialized();
      attempts++;

      const httpResponse = await fn();

      const response = this.responseNormalizer.normalize(
        httpResponse,
        context.requestId,
        startTime,
        attempts,
      );

      await this.eventQueue.publish({
        eventType: 'adapter.operation.success',
        workspaceId: context.workspaceId,
        provider: 'shopify',
        accountId: context.accountId,
        operation,
        success: true,
        duration: Date.now() - startTime.getTime(),
        timestamp: new Date(),
      });

      return response;
    } catch (error) {
      const adapterError = this.errorMapper.mapError(error);
      const response = this.responseNormalizer.normalizeError(
        adapterError,
        context.requestId,
        startTime,
        attempts,
      );

      await this.eventQueue.publish({
        eventType: 'adapter.operation.failed',
        workspaceId: context.workspaceId,
        provider: 'shopify',
        accountId: context.accountId,
        operation,
        success: false,
        duration: Date.now() - startTime.getTime(),
        metadata: {
          errorCode: adapterError.code,
          errorMessage: adapterError.message,
        },
        timestamp: new Date(),
      });

      return response;
    }
  }

  private createErrorResponse(
    context: IRequestContext,
    message: string,
  ): IAdapterResponse {
    return {
      success: false,
      error: {
        code: 'NOT_SUPPORTED',
        message,
      },
      metadata: {
        requestId: context.requestId,
        duration: 0,
        attempts: 0,
        timestamp: new Date(),
      },
    };
  }
}
