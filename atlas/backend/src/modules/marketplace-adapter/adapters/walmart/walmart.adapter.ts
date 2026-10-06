import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { WalmartApiClient } from './client/walmart-api.client';
import { WalmartAuthService } from './auth/walmart-auth.service';
import { WalmartRequestMapper } from './mappers/walmart-request.mapper';
import { WalmartResponseMapper } from './mappers/walmart-response.mapper';
import { WalmartErrorMapper } from './mappers/walmart-error.mapper';
import { WalmartAdapterEventQueue } from './events/walmart-adapter-event.queue';
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
import { IWalmartCredentials } from './interfaces/walmart.interfaces';
import {
  WALMART_API_PATHS,
  WALMART_RATE_LIMITS,
} from './constants/walmart.constants';

@Injectable()
export class WalmartAdapter extends BaseAdapter {
  private readonly logger = new Logger(WalmartAdapter.name);
  private walmartCredentials!: IWalmartCredentials;

  constructor(
    private readonly apiClient: WalmartApiClient,
    private readonly authService: WalmartAuthService,
    private readonly requestMapper: WalmartRequestMapper,
    private readonly responseMapper: WalmartResponseMapper,
    private readonly errorMapper: WalmartErrorMapper,
    private readonly eventQueue: WalmartAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.walmartCredentials = {
      clientId: this.credentials.credentials.clientId,
      clientSecret: this.credentials.credentials.clientSecret,
      consumerId: this.credentials.credentials.consumerId,
      privateKey: this.credentials.credentials.privateKey,
    };

    await this.authService.getAccessToken(this.walmartCredentials);

    this.logger.log(
      `Walmart adapter initialized for client ${this.walmartCredentials.clientId}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.authService.clearCache(this.walmartCredentials);
    this.logger.log(
      `Walmart adapter destroyed for client ${this.walmartCredentials.clientId}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'walmart',
      apiVersion: ApiVersion.V1,
      supportedCapabilities: [
        AdapterCapability.CATALOG_READ,
        AdapterCapability.CATALOG_WRITE,
        AdapterCapability.INVENTORY_READ,
        AdapterCapability.INVENTORY_WRITE,
        AdapterCapability.LISTING_READ,
        AdapterCapability.LISTING_WRITE,
        AdapterCapability.ORDER_READ,
        AdapterCapability.ORDER_WRITE,
        AdapterCapability.SHIPMENT_READ,
        AdapterCapability.SHIPMENT_WRITE,
        AdapterCapability.RETURN_READ,
        AdapterCapability.PRICING_READ,
        AdapterCapability.PRICING_WRITE,
        AdapterCapability.REPORT_READ,
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
        AdapterOperation.GET_ORDER,
        AdapterOperation.UPDATE_ORDER,
        AdapterOperation.GET_SHIPMENT,
        AdapterOperation.CREATE_SHIPMENT,
        AdapterOperation.GET_RETURN,
        AdapterOperation.GET_PRICING,
        AdapterOperation.UPDATE_PRICING,
        AdapterOperation.GET_REPORT,
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: WALMART_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_LISTING]: WALMART_RATE_LIMITS.ITEMS,
        [AdapterOperation.GET_INVENTORY]: WALMART_RATE_LIMITS.INVENTORY,
        [AdapterOperation.GET_SHIPMENT]: WALMART_RATE_LIMITS.SHIPMENTS,
        [AdapterOperation.GET_RETURN]: WALMART_RATE_LIMITS.RETURNS,
        [AdapterOperation.GET_REPORT]: WALMART_RATE_LIMITS.REPORTS,
        [AdapterOperation.GET_PRICING]: WALMART_RATE_LIMITS.PRICES,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.apiClient.get(
      this.walmartCredentials,
      WALMART_API_PATHS.ITEMS,
      { limit: 1 },
      undefined,
      false,
    );

    return {
      connected: response.status === 200,
      clientId: this.walmartCredentials.clientId,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.apiClient.get(
      this.walmartCredentials,
      WALMART_API_PATHS.ITEMS,
      { limit: 1 },
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.ITEMS,
          queryParams,
          WALMART_RATE_LIMITS.ITEMS,
          this.config.enableTracing,
        );

        const items =
          response.data?.ItemResponse?.map((item: any) =>
            this.responseMapper.mapItem(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
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
        const mappedData = this.requestMapper.mapItemData(data);

        const response = await this.apiClient.put(
          this.walmartCredentials,
          WALMART_API_PATHS.ITEMS,
          { MPItem: mappedData },
          undefined,
          WALMART_RATE_LIMITS.ITEMS,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.INVENTORY,
          queryParams,
          WALMART_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
        );

        const items =
          response.data?.elements?.map((item: any) =>
            this.responseMapper.mapInventory(item),
          ) || [];

        return {
          ...response,
          data: {
            items,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
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
        const mappedData = this.requestMapper.mapInventoryUpdate(data);

        const response = await this.apiClient.put(
          this.walmartCredentials,
          WALMART_API_PATHS.INVENTORY,
          { inventory: mappedData },
          { sku: data.sku },
          WALMART_RATE_LIMITS.INVENTORY,
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
        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.ITEM(listingId),
          undefined,
          WALMART_RATE_LIMITS.ITEMS,
          this.config.enableTracing,
        );

        const item = this.responseMapper.mapItem(response.data);

        return {
          ...response,
          data: item,
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
    return this.updateCatalog(context, { ...data, sku: listingId });
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
          this.walmartCredentials,
          WALMART_API_PATHS.ITEM(listingId),
          undefined,
          WALMART_RATE_LIMITS.ITEMS,
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
        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.ORDER(orderId),
          undefined,
          WALMART_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
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
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_ORDER,
      async () => {
        const response = await this.apiClient.post(
          this.walmartCredentials,
          WALMART_API_PATHS.ACKNOWLEDGE_ORDER(orderId),
          undefined,
          undefined,
          WALMART_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        return response;
      },
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
          }),
        };

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.ORDERS,
          queryParams,
          WALMART_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const orders =
          response.data?.elements?.list?.elements?.order?.map((order: any) =>
            this.responseMapper.mapOrder(order),
          ) || [];

        return {
          ...response,
          data: {
            orders,
            pagination: this.responseMapper.mapPagination(
              response.data?.elements?.list,
              queryParams.limit,
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
      'GET_SHIPMENT by ID not supported - use order shipments',
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
          this.walmartCredentials,
          WALMART_API_PATHS.SHIPMENTS,
          mappedData,
          undefined,
          WALMART_RATE_LIMITS.SHIPMENTS,
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
      'UPDATE_SHIPMENT not supported by Walmart API',
    );
  }

  async listShipments(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_SHIPMENTS not supported - query order shipments instead',
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
          this.walmartCredentials,
          WALMART_API_PATHS.RETURN(returnId),
          undefined,
          WALMART_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
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
      'PROCESS_RETURN not supported by Walmart API',
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
          this.walmartCredentials,
          WALMART_API_PATHS.RETURNS,
          queryParams,
          WALMART_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
        );

        const returns =
          response.data?.returnOrders?.map((returnItem: any) =>
            this.responseMapper.mapReturn(returnItem),
          ) || [];

        return {
          ...response,
          data: {
            returns,
            pagination: this.responseMapper.mapPagination(
              response.data,
              queryParams.limit,
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_PRICING,
      async () => {
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.PRICES,
          queryParams,
          WALMART_RATE_LIMITS.PRICES,
          this.config.enableTracing,
        );

        const pricing =
          response.data?.ItemPriceResponse?.map((item: any) =>
            this.responseMapper.mapPrice(item),
          ) || [];

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
        const mappedData = this.requestMapper.mapPriceUpdate(data);

        const response = await this.apiClient.put(
          this.walmartCredentials,
          WALMART_API_PATHS.PRICES,
          { ItemPrice: [mappedData] },
          undefined,
          WALMART_RATE_LIMITS.PRICES,
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
        const queryParams = {
          reportType,
          reportVersion: params?.version || 'v1',
        };

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.REPORTS,
          queryParams,
          WALMART_RATE_LIMITS.REPORTS,
          this.config.enableTracing,
        );

        return response;
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

        const response = await this.apiClient.get(
          this.walmartCredentials,
          WALMART_API_PATHS.REPORTS,
          queryParams,
          WALMART_RATE_LIMITS.REPORTS,
          this.config.enableTracing,
        );

        return response;
      },
    );
  }

  async registerWebhook(
    context: IRequestContext,
    data: { url: string; events: string[]; secret?: string },
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'REGISTER_WEBHOOK not supported by Walmart API',
    );
  }

  async unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UNREGISTER_WEBHOOK not supported by Walmart API',
    );
  }

  async listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_WEBHOOKS not supported by Walmart API',
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
        provider: 'walmart',
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
        provider: 'walmart',
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
