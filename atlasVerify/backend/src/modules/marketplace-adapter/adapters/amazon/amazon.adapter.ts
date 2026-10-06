import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import { AmazonRequestMapper } from '../mappers/amazon-request.mapper';
import { AmazonResponseMapper } from '../mappers/amazon-response.mapper';
import { AmazonErrorMapper } from '../mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from '../events/amazon-adapter-event.queue';
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
import { IAmazonCredentials } from '../interfaces/amazon.interfaces';
import {
  AMAZON_API_PATHS,
  AMAZON_RATE_LIMITS,
  AMAZON_MARKETPLACE_REGIONS,
} from '../constants/amazon.constants';

@Injectable()
export class AmazonAdapter extends BaseAdapter {
  private readonly logger = new Logger(AmazonAdapter.name);
  private amazonCredentials: IAmazonCredentials;

  constructor(
    private readonly spApiClient: AmazonSpApiClient,
    private readonly authService: AmazonAuthService,
    private readonly requestMapper: AmazonRequestMapper,
    private readonly responseMapper: AmazonResponseMapper,
    private readonly errorMapper: AmazonErrorMapper,
    private readonly eventQueue: AmazonAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.amazonCredentials = {
      clientId: this.credentials.credentials.clientId,
      clientSecret: this.credentials.credentials.clientSecret,
      refreshToken: this.credentials.credentials.refreshToken,
      sellerId: this.credentials.credentials.sellerId,
      marketplace: this.credentials.credentials.marketplace,
      region:
        AMAZON_MARKETPLACE_REGIONS[this.credentials.credentials.marketplace],
    };

    await this.authService.getAccessToken(this.amazonCredentials);

    this.logger.log(
      `Amazon adapter initialized for seller ${this.amazonCredentials.sellerId}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.authService.clearCache(this.amazonCredentials);
    this.logger.log(
      `Amazon adapter destroyed for seller ${this.amazonCredentials.sellerId}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'amazon',
      apiVersion: ApiVersion.V1,
      supportedCapabilities: [
        AdapterCapability.CATALOG_READ,
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
        AdapterCapability.REPORT_READ,
        AdapterCapability.WEBHOOK_MANAGEMENT,
        AdapterCapability.BATCH_OPERATIONS,
      ],
      supportedOperations: [
        AdapterOperation.GET_CATALOG,
        AdapterOperation.GET_INVENTORY,
        AdapterOperation.UPDATE_INVENTORY,
        AdapterOperation.GET_LISTING,
        AdapterOperation.CREATE_LISTING,
        AdapterOperation.UPDATE_LISTING,
        AdapterOperation.DELETE_LISTING,
        AdapterOperation.GET_ORDER,
        AdapterOperation.GET_SHIPMENT,
        AdapterOperation.CREATE_SHIPMENT,
        AdapterOperation.UPDATE_SHIPMENT,
        AdapterOperation.GET_RETURN,
        AdapterOperation.GET_PRICING,
        AdapterOperation.UPDATE_PRICING,
        AdapterOperation.GET_REPORT,
        AdapterOperation.REGISTER_WEBHOOK,
        AdapterOperation.UNREGISTER_WEBHOOK,
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: AMAZON_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_CATALOG]: AMAZON_RATE_LIMITS.CATALOG_ITEMS,
        [AdapterOperation.GET_LISTING]: AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
        [AdapterOperation.GET_INVENTORY]: AMAZON_RATE_LIMITS.INVENTORY_SUMMARIES,
        [AdapterOperation.GET_SHIPMENT]: AMAZON_RATE_LIMITS.SHIPMENTS,
        [AdapterOperation.GET_REPORT]: AMAZON_RATE_LIMITS.REPORTS,
        [AdapterOperation.GET_PRICING]: AMAZON_RATE_LIMITS.PRICING,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.spApiClient.get(
      this.amazonCredentials,
      AMAZON_API_PATHS.SELLER_INFO,
      undefined,
      AMAZON_RATE_LIMITS.SELLER_INFO,
      false,
    );

    return {
      connected: response.status === 200,
      sellerId: this.amazonCredentials.sellerId,
      marketplace: this.amazonCredentials.marketplace,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.spApiClient.get(
      this.amazonCredentials,
      AMAZON_API_PATHS.SELLER_INFO,
      undefined,
      AMAZON_RATE_LIMITS.SELLER_INFO,
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
        const queryParams = {
          ...this.requestMapper.mapPagination(params),
          marketplaceIds: [this.amazonCredentials.marketplace],
        };

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.CATALOG_ITEMS,
          queryParams,
          AMAZON_RATE_LIMITS.CATALOG_ITEMS,
          this.config.enableTracing,
        );

        const items =
          response.data?.items?.map((item: any) =>
            this.responseMapper.mapCatalogItem(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(response.data),
          },
        };
      },
    );
  }

  async updateCatalog(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UPDATE_CATALOG not supported by Amazon SP-API',
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
        const queryParams = {
          ...this.requestMapper.mapPagination(params),
          marketplaceIds: [this.amazonCredentials.marketplace],
        };

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.INVENTORY_SUMMARIES,
          queryParams,
          AMAZON_RATE_LIMITS.INVENTORY_SUMMARIES,
          this.config.enableTracing,
        );

        const items =
          response.data?.inventorySummaries?.map((item: any) =>
            this.responseMapper.mapInventory(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(response.data),
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
        const mappedData = this.requestMapper.mapInventoryUpdate(data);

        const response = await this.spApiClient.patch(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(
            this.amazonCredentials.sellerId,
            data.sku,
          ),
          mappedData,
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
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
        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(
            this.amazonCredentials.sellerId,
            listingId,
          ),
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
          this.config.enableTracing,
        );

        const listing = this.responseMapper.mapListing({
          ...response.data,
          sku: listingId,
        });

        return {
          ...response,
          data: listing,
        };
      },
    );
  }

  async createListing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.CREATE_LISTING,
      async () => {
        const mappedData = this.requestMapper.mapListingData({
          ...data,
          marketplaceId: this.amazonCredentials.marketplace,
        });

        const response = await this.spApiClient.put(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(this.amazonCredentials.sellerId, data.sku),
          mappedData,
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async updateListing(
    context: IRequestContext,
    listingId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_LISTING,
      async () => {
        const mappedData = this.requestMapper.mapListingData({
          ...data,
          marketplaceId: this.amazonCredentials.marketplace,
        });

        const response = await this.spApiClient.patch(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(
            this.amazonCredentials.sellerId,
            listingId,
          ),
          mappedData,
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async deleteListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.DELETE_LISTING,
      async () => {
        const response = await this.spApiClient.delete(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(
            this.amazonCredentials.sellerId,
            listingId,
          ),
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_LISTING,
      async () => {
        const queryParams = {
          ...this.requestMapper.mapPagination(params),
          marketplaceIds: [this.amazonCredentials.marketplace],
        };

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEMS,
          queryParams,
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
          this.config.enableTracing,
        );

        const items =
          response.data?.listings?.map((item: any) =>
            this.responseMapper.mapListing(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(response.data),
          },
        };
      },
    );
  }

  async getOrder(
    context: IRequestContext,
    orderId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_ORDER,
      async () => {
        const response = await this.spApiClient.get(
          this.amazonCredentials,
          `${AMAZON_API_PATHS.ORDERS}/${orderId}`,
          undefined,
          AMAZON_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const itemsResponse = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.ORDER_ITEMS(orderId),
          undefined,
          AMAZON_RATE_LIMITS.ORDER_ITEMS,
          this.config.enableTracing,
        );

        const order = this.responseMapper.mapOrder({
          ...response.data,
          OrderItems: itemsResponse.data?.OrderItems,
        });

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
      'UPDATE_ORDER not supported by Amazon SP-API',
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
        const queryParams = {
          ...this.requestMapper.mapPagination(params),
          ...this.requestMapper.mapOrderFilters({
            startDate: params?.startDate,
            endDate: params?.endDate,
            marketplaceIds: [this.amazonCredentials.marketplace],
          }),
        };

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.ORDERS,
          queryParams,
          AMAZON_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const orders =
          response.data?.Orders?.map((order: any) =>
            this.responseMapper.mapOrder(order),
          ) || [];

        return {
          ...response,
          data: {
            orders,
            pagination: this.responseMapper.mapPagination(response.data),
          },
        };
      },
    );
  }

  async getShipment(
    context: IRequestContext,
    shipmentId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_SHIPMENT,
      async () => {
        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.SHIPMENT(shipmentId),
          undefined,
          AMAZON_RATE_LIMITS.SHIPMENTS,
          this.config.enableTracing,
        );

        const shipment = this.responseMapper.mapShipment(response.data);

        return {
          ...response,
          data: shipment,
        };
      },
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
        const mappedData = this.requestMapper.mapShipmentData(data);

        const response = await this.spApiClient.post(
          this.amazonCredentials,
          AMAZON_API_PATHS.SHIPMENTS,
          mappedData,
          undefined,
          AMAZON_RATE_LIMITS.SHIPMENTS,
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
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_SHIPMENT,
      async () => {
        const mappedData = this.requestMapper.mapShipmentData(data);

        const response = await this.spApiClient.put(
          this.amazonCredentials,
          AMAZON_API_PATHS.SHIPMENT(shipmentId),
          mappedData,
          undefined,
          AMAZON_RATE_LIMITS.SHIPMENTS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async listShipments(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_SHIPMENT,
      async () => {
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.SHIPMENTS,
          queryParams,
          AMAZON_RATE_LIMITS.SHIPMENTS,
          this.config.enableTracing,
        );

        const shipments =
          response.data?.ShipmentData?.map((shipment: any) =>
            this.responseMapper.mapShipment(shipment),
          ) || [];

        return {
          ...response,
          data: {
            shipments,
            pagination: this.responseMapper.mapPagination(response.data),
          },
        };
      },
    );
  }

  async getReturn(
    context: IRequestContext,
    returnId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'GET_RETURN not directly supported by Amazon SP-API',
    );
  }

  async processReturn(
    context: IRequestContext,
    returnId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'PROCESS_RETURN not supported by Amazon SP-API',
    );
  }

  async listReturns(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_RETURNS not directly supported - use reports instead',
    );
  }

  async getPricing(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_PRICING,
      async () => {
        const queryParams = {
          MarketplaceId: this.amazonCredentials.marketplace,
          ItemType: 'Sku',
          Skus: params?.cursor ? [params.cursor] : [],
        };

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.PRODUCT_PRICING,
          queryParams,
          AMAZON_RATE_LIMITS.PRICING,
          this.config.enableTracing,
        );

        const pricing = response.data?.payload?.map((item: any) =>
          this.responseMapper.mapPricing(item),
        );

        return {
          ...response,
          data: pricing,
        };
      },
    );
  }

  async updatePricing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_PRICING,
      async () => {
        const mappedData = this.requestMapper.mapPricingUpdate(data);

        const response = await this.spApiClient.patch(
          this.amazonCredentials,
          AMAZON_API_PATHS.LISTINGS_ITEM(this.amazonCredentials.sellerId, data.sku),
          mappedData,
          { marketplaceIds: [this.amazonCredentials.marketplace] },
          AMAZON_RATE_LIMITS.LISTINGS_ITEMS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async getReport(
    context: IRequestContext,
    reportType: string,
    params?: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_REPORT,
      async () => {
        const requestData = this.requestMapper.mapReportRequest(
          reportType,
          params,
        );

        const createResponse = await this.spApiClient.post(
          this.amazonCredentials,
          AMAZON_API_PATHS.CREATE_REPORT,
          requestData,
          undefined,
          AMAZON_RATE_LIMITS.REPORTS,
          this.config.enableTracing,
        );

        const reportId = createResponse.data?.reportId;

        return {
          ...createResponse,
          data: {
            reportId,
            status: 'PROCESSING',
            message: 'Report request submitted',
          },
        };
      },
    );
  }

  async listReports(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_REPORT,
      async () => {
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.REPORTS,
          queryParams,
          AMAZON_RATE_LIMITS.REPORTS,
          this.config.enableTracing,
        );

        const reports =
          response.data?.reports?.map((report: any) =>
            this.responseMapper.mapReport(report),
          ) || [];

        return {
          ...response,
          data: {
            reports,
            pagination: this.responseMapper.mapPagination(response.data),
          },
        };
      },
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
        const destinationResponse = await this.spApiClient.post(
          this.amazonCredentials,
          AMAZON_API_PATHS.NOTIFICATIONS_DESTINATIONS,
          {
            resourceSpecification: {
              sqs: {
                arn: data.url,
              },
            },
            name: `webhook-${Date.now()}`,
          },
          undefined,
          AMAZON_RATE_LIMITS.NOTIFICATIONS,
          this.config.enableTracing,
        );

        const destinationId = destinationResponse.data?.destinationId;

        for (const eventType of data.events) {
          await this.spApiClient.post(
            this.amazonCredentials,
            `${AMAZON_API_PATHS.NOTIFICATIONS_SUBSCRIPTIONS}/${eventType}`,
            {
              destinationId,
              payloadVersion: '1.0',
            },
            undefined,
            AMAZON_RATE_LIMITS.NOTIFICATIONS,
            this.config.enableTracing,
          );
        }

        return {
          ...destinationResponse,
          data: {
            webhookId: destinationId,
            events: data.events,
          },
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
        const response = await this.spApiClient.delete(
          this.amazonCredentials,
          `${AMAZON_API_PATHS.NOTIFICATIONS_DESTINATIONS}/${webhookId}`,
          undefined,
          AMAZON_RATE_LIMITS.NOTIFICATIONS,
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
        const response = await this.spApiClient.get(
          this.amazonCredentials,
          AMAZON_API_PATHS.NOTIFICATIONS_DESTINATIONS,
          undefined,
          AMAZON_RATE_LIMITS.NOTIFICATIONS,
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
        provider: 'amazon',
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
        provider: 'amazon',
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
