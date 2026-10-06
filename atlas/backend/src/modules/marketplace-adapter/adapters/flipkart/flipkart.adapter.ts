import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { FlipkartApiClient } from './client/flipkart-api.client';
import { FlipkartAuthService } from './auth/flipkart-auth.service';
import { FlipkartRequestMapper } from './mappers/flipkart-request.mapper';
import { FlipkartResponseMapper } from './mappers/flipkart-response.mapper';
import { FlipkartErrorMapper } from './mappers/flipkart-error.mapper';
import { FlipkartAdapterEventQueue } from './events/flipkart-adapter-event.queue';
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
import { IFlipkartCredentials } from './interfaces/flipkart.interfaces';
import {
  FLIPKART_API_PATHS,
  FLIPKART_RATE_LIMITS,
} from './constants/flipkart.constants';

@Injectable()
export class FlipkartAdapter extends BaseAdapter {
  private readonly logger = new Logger(FlipkartAdapter.name);
  private flipkartCredentials!: IFlipkartCredentials;

  constructor(
    private readonly apiClient: FlipkartApiClient,
    private readonly authService: FlipkartAuthService,
    private readonly requestMapper: FlipkartRequestMapper,
    private readonly responseMapper: FlipkartResponseMapper,
    private readonly errorMapper: FlipkartErrorMapper,
    private readonly eventQueue: FlipkartAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.flipkartCredentials = {
      appId: this.credentials.credentials.appId,
      appSecret: this.credentials.credentials.appSecret,
      sellerId: this.credentials.credentials.sellerId,
      accessToken: this.credentials.credentials.accessToken,
    };

    await this.authService.getAccessToken(this.flipkartCredentials);

    this.logger.log(
      `Flipkart adapter initialized for seller ${this.flipkartCredentials.sellerId}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.authService.clearCache(this.flipkartCredentials);
    this.logger.log(
      `Flipkart adapter destroyed for seller ${this.flipkartCredentials.sellerId}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'flipkart',
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
        AdapterOperation.GET_RETURN,
        AdapterOperation.PROCESS_RETURN,
        AdapterOperation.GET_PRICING,
        AdapterOperation.UPDATE_PRICING,
        AdapterOperation.GET_REPORT,
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: FLIPKART_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_LISTING]: FLIPKART_RATE_LIMITS.LISTINGS,
        [AdapterOperation.GET_INVENTORY]: FLIPKART_RATE_LIMITS.INVENTORY,
        [AdapterOperation.GET_SHIPMENT]: FLIPKART_RATE_LIMITS.SHIPMENTS,
        [AdapterOperation.GET_RETURN]: FLIPKART_RATE_LIMITS.RETURNS,
        [AdapterOperation.GET_REPORT]: FLIPKART_RATE_LIMITS.REPORTS,
        [AdapterOperation.GET_PRICING]: FLIPKART_RATE_LIMITS.PRICING,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.apiClient.get(
      this.flipkartCredentials,
      FLIPKART_API_PATHS.SERVICE_PROFILE,
      undefined,
      undefined,
      false,
    );

    return {
      connected: response.status === 200,
      sellerId: this.flipkartCredentials.sellerId,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.apiClient.get(
      this.flipkartCredentials,
      FLIPKART_API_PATHS.SERVICE_PROFILE,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.PRODUCTS,
          queryParams,
          FLIPKART_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        const items =
          response.data?.products?.map((item: any) =>
            this.responseMapper.mapProduct(item),
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
      'UPDATE_CATALOG not supported by Flipkart API',
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
          this.flipkartCredentials,
          FLIPKART_API_PATHS.INVENTORY,
          queryParams,
          FLIPKART_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
        );

        const items =
          response.data?.inventory?.map((item: any) =>
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

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.INVENTORY,
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.INVENTORY,
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
          this.flipkartCredentials,
          FLIPKART_API_PATHS.LISTING(listingId),
          undefined,
          FLIPKART_RATE_LIMITS.LISTINGS,
          this.config.enableTracing,
        );

        const listing = this.responseMapper.mapListing(response.data);

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
        const mappedData = this.requestMapper.mapListingData(data);

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.LISTINGS,
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.LISTINGS,
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
        const mappedData = this.requestMapper.mapListingData(data);

        const response = await this.apiClient.put(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.LISTING(listingId),
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.LISTINGS,
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
        const response = await this.apiClient.delete(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.LISTING(listingId),
          undefined,
          FLIPKART_RATE_LIMITS.LISTINGS,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.LISTINGS,
          queryParams,
          FLIPKART_RATE_LIMITS.LISTINGS,
          this.config.enableTracing,
        );

        const items =
          response.data?.skus?.map((item: any) =>
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
        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.ORDER(orderId),
          undefined,
          FLIPKART_RATE_LIMITS.ORDERS,
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
    return this.createErrorResponse(
      context,
      'UPDATE_ORDER not supported by Flipkart API',
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
        const filters = this.requestMapper.mapOrderFilters({
          startDate: params?.startDate,
          endDate: params?.endDate,
        });

        const requestBody = {
          ...filters,
          pagination: this.requestMapper.mapPagination(params),
        };

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.ORDERS,
          requestBody,
          undefined,
          FLIPKART_RATE_LIMITS.ORDERS,
          this.config.enableTracing,
        );

        const orders =
          response.data?.orders?.map((order: any) =>
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
        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.SHIPMENT(shipmentId),
          undefined,
          FLIPKART_RATE_LIMITS.SHIPMENTS,
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

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.DISPATCH_SHIPMENT(data.orderId),
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.SHIPMENTS,
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

        const response = await this.apiClient.put(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.SHIPMENT(shipmentId),
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.SHIPMENTS,
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

        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.SHIPMENTS,
          queryParams,
          FLIPKART_RATE_LIMITS.SHIPMENTS,
          this.config.enableTracing,
        );

        const shipments =
          response.data?.shipments?.map((shipment: any) =>
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_RETURN,
      async () => {
        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.RETURN(returnId),
          undefined,
          FLIPKART_RATE_LIMITS.RETURNS,
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
    return this.executeOperation(
      context,
      AdapterOperation.PROCESS_RETURN,
      async () => {
        const mappedData = this.requestMapper.mapReturnAction(
          data.action,
          data,
        );

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.RETURN_ACTION(returnId),
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
        );

        return response;
      },
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
        const requestBody = {
          filter: {},
          pagination: this.requestMapper.mapPagination(params),
        };

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.RETURNS,
          requestBody,
          undefined,
          FLIPKART_RATE_LIMITS.RETURNS,
          this.config.enableTracing,
        );

        const returns =
          response.data?.returns?.map((returnItem: any) =>
            this.responseMapper.mapReturn(returnItem),
          ) || [];

        return {
          ...response,
          data: {
            returns,
            pagination: this.responseMapper.mapPagination(response.data),
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
          this.flipkartCredentials,
          FLIPKART_API_PATHS.PRICING,
          queryParams,
          FLIPKART_RATE_LIMITS.PRICING,
          this.config.enableTracing,
        );

        const pricing =
          response.data?.pricing?.map((item: any) =>
            this.responseMapper.mapPricing(item),
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
        const mappedData = this.requestMapper.mapPricingUpdate(data);

        const response = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.PRICING,
          mappedData,
          undefined,
          FLIPKART_RATE_LIMITS.PRICING,
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
        const requestData = {
          reportType,
          startDate: params?.startDate?.toISOString(),
          endDate: params?.endDate?.toISOString(),
        };

        const createResponse = await this.apiClient.post(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.REPORTS,
          requestData,
          undefined,
          FLIPKART_RATE_LIMITS.REPORTS,
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

        const response = await this.apiClient.get(
          this.flipkartCredentials,
          FLIPKART_API_PATHS.REPORTS,
          queryParams,
          FLIPKART_RATE_LIMITS.REPORTS,
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
    return this.createErrorResponse(
      context,
      'REGISTER_WEBHOOK not supported by Flipkart API',
    );
  }

  async unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UNREGISTER_WEBHOOK not supported by Flipkart API',
    );
  }

  async listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_WEBHOOKS not supported by Flipkart API',
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
        provider: 'flipkart',
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
        provider: 'flipkart',
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
