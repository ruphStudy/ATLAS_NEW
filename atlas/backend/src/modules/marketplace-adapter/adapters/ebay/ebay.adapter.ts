import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { EbayApiClient } from './client/ebay-api.client';
import { EbayAuthService } from './auth/ebay-auth.service';
import { EbayRequestMapper } from './mappers/ebay-request.mapper';
import { EbayResponseMapper } from './mappers/ebay-response.mapper';
import { EbayErrorMapper } from './mappers/ebay-error.mapper';
import { EbayAdapterEventQueue } from './events/ebay-adapter-event.queue';
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
import { IEbayCredentials } from './interfaces/ebay.interfaces';
import {
  EBAY_API_PATHS,
  EBAY_RATE_LIMITS,
  EBAY_MARKETPLACE_IDS,
} from './constants/ebay.constants';

@Injectable()
export class EbayAdapter extends BaseAdapter {
  private readonly logger = new Logger(EbayAdapter.name);
  private ebayCredentials!: IEbayCredentials;
  private defaultMarketplaceId: string = EBAY_MARKETPLACE_IDS.US;

  constructor(
    private readonly apiClient: EbayApiClient,
    private readonly authService: EbayAuthService,
    private readonly requestMapper: EbayRequestMapper,
    private readonly responseMapper: EbayResponseMapper,
    private readonly errorMapper: EbayErrorMapper,
    private readonly eventQueue: EbayAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.ebayCredentials = {
      clientId: this.credentials.credentials.clientId,
      clientSecret: this.credentials.credentials.clientSecret,
      refreshToken: this.credentials.credentials.refreshToken,
      redirectUri: this.credentials.credentials.redirectUri,
    };

    const marketplaceId = this.config.customSettings?.['marketplaceId'];
    if (marketplaceId) {
      this.defaultMarketplaceId = marketplaceId;
    }

    await this.authService.getAccessToken(this.ebayCredentials);

    this.logger.log(
      `eBay adapter initialized for client ${this.ebayCredentials.clientId}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.authService.clearCache(this.ebayCredentials);
    this.logger.log(
      `eBay adapter destroyed for client ${this.ebayCredentials.clientId}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'ebay',
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
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: EBAY_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_LISTING]: EBAY_RATE_LIMITS.OFFERS,
        [AdapterOperation.GET_INVENTORY]: EBAY_RATE_LIMITS.INVENTORY,
        [AdapterOperation.GET_SHIPMENT]: EBAY_RATE_LIMITS.SHIPMENTS,
        [AdapterOperation.GET_RETURN]: EBAY_RATE_LIMITS.RETURNS,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.apiClient.get(
      this.ebayCredentials,
      EBAY_API_PATHS.INVENTORY_ITEMS,
      { limit: 1 },
      undefined,
      false,
      this.defaultMarketplaceId,
    );

    return {
      connected: response.status === 200,
      clientId: this.ebayCredentials.clientId,
      marketplaceId: this.defaultMarketplaceId,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.apiClient.get(
      this.ebayCredentials,
      EBAY_API_PATHS.INVENTORY_ITEMS,
      { limit: 1 },
      undefined,
      false,
      this.defaultMarketplaceId,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.INVENTORY_ITEMS,
          queryParams,
          EBAY_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const items =
          response.data?.inventoryItems?.map((item: any) =>
            this.responseMapper.mapInventoryItem(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
              queryParams.offset,
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
        const mappedData = this.requestMapper.mapInventoryItem(data);

        const response = await this.apiClient.put(
          this.ebayCredentials,
          EBAY_API_PATHS.INVENTORY_ITEM(data.sku),
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        return response;
      },
    );
  }

  async getInventory(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.getCatalog(context, params);
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

        const response = await this.apiClient.post(
          this.ebayCredentials,
          EBAY_API_PATHS.INVENTORY_ITEM(data.sku),
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
          this.defaultMarketplaceId,
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
        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFER(listingId),
          undefined,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const offer = this.responseMapper.mapOffer(response.data);

        return {
          ...response,
          data: offer,
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
        const mappedData = this.requestMapper.mapOffer(data);

        const response = await this.apiClient.post(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFERS,
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        if (data.publish && response.data?.offerId) {
          await this.apiClient.post(
            this.ebayCredentials,
            EBAY_API_PATHS.PUBLISH_OFFER(response.data.offerId),
            undefined,
            undefined,
            EBAY_RATE_LIMITS.OFFERS,
            this.config.enableTracing,
            this.defaultMarketplaceId,
          );
        }

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
        const mappedData = this.requestMapper.mapOffer(data);

        const response = await this.apiClient.put(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFER(listingId),
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
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
        const response = await this.apiClient.delete(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFER(listingId),
          undefined,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFERS,
          queryParams,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const offers =
          response.data?.offers?.map((offer: any) =>
            this.responseMapper.mapOffer(offer),
          ) || [];

        return {
          ...response,
          data: {
            offers,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
              queryParams.offset,
            ),
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
        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.ORDER(orderId),
          undefined,
          EBAY_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const order = this.responseMapper.mapOrder(response.data);

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
      'UPDATE_ORDER not supported by eBay API',
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
        const queryParams = this.requestMapper.mapPagination(params);
        const filter = this.requestMapper.mapOrderFilters({
          startDate: params?.startDate,
          endDate: params?.endDate,
        });

        if (filter) {
          queryParams.filter = filter;
        }

        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.ORDERS,
          queryParams,
          EBAY_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const orders =
          response.data?.orders?.map((order: any) =>
            this.responseMapper.mapOrder(order),
          ) || [];

        return {
          ...response,
          data: {
            orders,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
              queryParams.offset,
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
        const mappedData = this.requestMapper.mapShipmentData(data);

        const response = await this.apiClient.post(
          this.ebayCredentials,
          EBAY_API_PATHS.SHIPMENT(data.orderId),
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.SHIPMENTS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
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
      'UPDATE_SHIPMENT not supported by eBay API',
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_RETURN,
      async () => {
        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.RETURN(returnId),
          undefined,
          EBAY_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const returnData = this.responseMapper.mapReturn(response.data);

        return {
          ...response,
          data: returnData,
        };
      },
    );
  }

  async processReturn(
    context: IRequestContext,
    returnId: string,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'PROCESS_RETURN requires specific action APIs',
    );
  }

  async listReturns(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_RETURN,
      async () => {
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.ebayCredentials,
          EBAY_API_PATHS.RETURNS,
          queryParams,
          EBAY_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
        );

        const returns =
          response.data?.members?.map((returnItem: any) =>
            this.responseMapper.mapReturn(returnItem),
          ) || [];

        return {
          ...response,
          data: {
            returns,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
              queryParams.offset,
            ),
          },
        };
      },
    );
  }

  async getPricing(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.listListings(context, params);
  }

  async updatePricing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_PRICING,
      async () => {
        const mappedData = this.requestMapper.mapPriceUpdate(data);

        const response = await this.apiClient.put(
          this.ebayCredentials,
          EBAY_API_PATHS.OFFER(data.offerId),
          mappedData,
          undefined,
          EBAY_RATE_LIMITS.OFFERS,
          this.config.enableTracing,
          this.defaultMarketplaceId,
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
    return this.createErrorResponse(
      context,
      'GET_REPORT not implemented - use eBay Analytics API',
    );
  }

  async listReports(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_REPORTS not implemented - use eBay Analytics API',
    );
  }

  async registerWebhook(
    context: IRequestContext,
    data: { url: string; events: string[]; secret?: string },
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'REGISTER_WEBHOOK requires eBay Commerce Notification API setup',
    );
  }

  async unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UNREGISTER_WEBHOOK requires eBay Commerce Notification API',
    );
  }

  async listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_WEBHOOKS requires eBay Commerce Notification API',
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
        provider: 'ebay',
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
        provider: 'ebay',
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
