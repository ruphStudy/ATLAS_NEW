import { Injectable, Logger } from '@nestjs/common';
import { BaseAdapter } from '../../adapter/base.adapter';
import { MeeshoApiClient } from './client/meesho-api.client';
import { MeeshoAuthService } from './auth/meesho-auth.service';
import { MeeshoRequestMapper } from './mappers/meesho-request.mapper';
import { MeeshoResponseMapper } from './mappers/meesho-response.mapper';
import { MeeshoErrorMapper } from './mappers/meesho-error.mapper';
import { MeeshoAdapterEventQueue } from './events/meesho-adapter-event.queue';
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
import { IMeeshoCredentials } from './interfaces/meesho.interfaces';
import {
  MEESHO_API_PATHS,
  MEESHO_RATE_LIMITS,
} from './constants/meesho.constants';

@Injectable()
export class MeeshoAdapter extends BaseAdapter {
  private readonly logger = new Logger(MeeshoAdapter.name);
  private meeshoCredentials: IMeeshoCredentials;

  constructor(
    private readonly apiClient: MeeshoApiClient,
    private readonly authService: MeeshoAuthService,
    private readonly requestMapper: MeeshoRequestMapper,
    private readonly responseMapper: MeeshoResponseMapper,
    private readonly errorMapper: MeeshoErrorMapper,
    private readonly eventQueue: MeeshoAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {
    super();
  }

  protected async onInitialize(): Promise<void> {
    this.meeshoCredentials = {
      supplierId: this.credentials.credentials.supplierId,
      apiKey: this.credentials.credentials.apiKey,
      apiSecret: this.credentials.credentials.apiSecret,
    };

    if (!this.authService.validateCredentials(this.meeshoCredentials)) {
      throw new Error('Invalid Meesho credentials');
    }

    this.logger.log(
      `Meesho adapter initialized for supplier ${this.meeshoCredentials.supplierId}`,
    );
  }

  protected async onDestroy(): Promise<void> {
    this.logger.log(
      `Meesho adapter destroyed for supplier ${this.meeshoCredentials.supplierId}`,
    );
  }

  getCapabilities(): IAdapterCapabilities {
    return {
      provider: 'meesho',
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
        AdapterOperation.GET_SHIPMENT,
        AdapterOperation.CREATE_SHIPMENT,
        AdapterOperation.GET_RETURN,
        AdapterOperation.GET_PRICING,
        AdapterOperation.UPDATE_PRICING,
        AdapterOperation.GET_REPORT,
      ],
      rateLimits: {
        [AdapterOperation.GET_ORDER]: MEESHO_RATE_LIMITS.ORDERS,
        [AdapterOperation.GET_LISTING]: MEESHO_RATE_LIMITS.PRODUCTS,
        [AdapterOperation.GET_INVENTORY]: MEESHO_RATE_LIMITS.INVENTORY,
        [AdapterOperation.GET_SHIPMENT]: MEESHO_RATE_LIMITS.SHIPMENTS,
        [AdapterOperation.GET_RETURN]: MEESHO_RATE_LIMITS.RETURNS,
        [AdapterOperation.GET_PRICING]: MEESHO_RATE_LIMITS.PRICES,
        [AdapterOperation.GET_REPORT]: MEESHO_RATE_LIMITS.REPORTS,
      },
    };
  }

  protected async performHealthCheck(): Promise<any> {
    const response = await this.apiClient.get(
      this.meeshoCredentials,
      MEESHO_API_PATHS.SUPPLIER_INFO,
      undefined,
      undefined,
      false,
    );

    return {
      connected: response.status === 200,
      supplierId: this.meeshoCredentials.supplierId,
      supplierInfo: response.data,
    };
  }

  protected async performConnectionTest(): Promise<void> {
    await this.apiClient.get(
      this.meeshoCredentials,
      MEESHO_API_PATHS.SUPPLIER_INFO,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRODUCTS,
          queryParams,
          MEESHO_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        const products =
          response.data?.products?.map((product: any) =>
            this.responseMapper.mapProduct(product),
          ) || [];

        return {
          ...response,
          data: {
            products,
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
        const mappedData = this.requestMapper.mapProductData(data);

        const response = await this.apiClient.put(
          this.meeshoCredentials,
          data.productId
            ? MEESHO_API_PATHS.PRODUCT(data.productId)
            : MEESHO_API_PATHS.PRODUCTS,
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.PRODUCTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.INVENTORY,
          queryParams,
          MEESHO_RATE_LIMITS.INVENTORY,
          this.config.enableTracing,
        );

        const inventory =
          response.data?.inventory?.map((item: any) =>
            this.responseMapper.mapInventory(item),
          ) || [];

        return {
          ...response,
          data: {
            inventory,
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

  async updateInventory(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.UPDATE_INVENTORY,
      async () => {
        const mappedData = this.requestMapper.mapInventoryUpdate(data);

        const response = await this.apiClient.patch(
          this.meeshoCredentials,
          MEESHO_API_PATHS.INVENTORY_UPDATE(data.sku),
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.INVENTORY,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRODUCT(listingId),
          undefined,
          MEESHO_RATE_LIMITS.PRODUCTS,
          this.config.enableTracing,
        );

        const product = this.responseMapper.mapProduct(response.data);

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
    return this.executeOperation(
      context,
      AdapterOperation.CREATE_LISTING,
      async () => {
        const mappedData = this.requestMapper.mapProductData(data);

        const response = await this.apiClient.post(
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRODUCTS,
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.PRODUCTS,
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
        const mappedData = this.requestMapper.mapProductData(data);

        const response = await this.apiClient.put(
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRODUCT(listingId),
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.PRODUCTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRODUCT(listingId),
          undefined,
          MEESHO_RATE_LIMITS.PRODUCTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.ORDER(orderId),
          undefined,
          MEESHO_RATE_LIMITS.ORDERS,
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
      'UPDATE_ORDER not supported by Meesho API',
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.ORDERS,
          queryParams,
          MEESHO_RATE_LIMITS.ORDERS,
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_SHIPMENT,
      async () => {
        const response = await this.apiClient.get(
          this.meeshoCredentials,
          MEESHO_API_PATHS.SHIPMENT(shipmentId),
          undefined,
          MEESHO_RATE_LIMITS.SHIPMENTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.SHIPMENTS,
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.SHIPMENTS,
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
        const response = await this.apiClient.patch(
          this.meeshoCredentials,
          MEESHO_API_PATHS.SHIPMENT(shipmentId),
          data,
          undefined,
          MEESHO_RATE_LIMITS.SHIPMENTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.SHIPMENTS,
          queryParams,
          MEESHO_RATE_LIMITS.SHIPMENTS,
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

  async getReturn(
    context: IRequestContext,
    returnId: string,
  ): Promise<IAdapterResponse> {
    return this.executeOperation(
      context,
      AdapterOperation.GET_RETURN,
      async () => {
        const response = await this.apiClient.get(
          this.meeshoCredentials,
          MEESHO_API_PATHS.RETURN(returnId),
          undefined,
          MEESHO_RATE_LIMITS.RETURNS,
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
        const mappedData = this.requestMapper.mapReturnUpdate(data);

        const response = await this.apiClient.patch(
          this.meeshoCredentials,
          MEESHO_API_PATHS.RETURN(returnId),
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.RETURNS,
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
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.meeshoCredentials,
          MEESHO_API_PATHS.RETURNS,
          queryParams,
          MEESHO_RATE_LIMITS.RETURNS,
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
    return this.executeOperation(
      context,
      AdapterOperation.GET_PRICING,
      async () => {
        const queryParams = this.requestMapper.mapPagination(params);

        const response = await this.apiClient.get(
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRICES,
          queryParams,
          MEESHO_RATE_LIMITS.PRICES,
          this.config.enableTracing,
        );

        const prices =
          response.data?.prices?.map((price: any) =>
            this.responseMapper.mapPrice(price),
          ) || [];

        return {
          ...response,
          data: {
            prices,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.PRICE_UPDATE(data.sku),
          mappedData,
          undefined,
          MEESHO_RATE_LIMITS.PRICES,
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
          ...params,
        };

        const response = await this.apiClient.get(
          this.meeshoCredentials,
          MEESHO_API_PATHS.REPORTS,
          queryParams,
          MEESHO_RATE_LIMITS.REPORTS,
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
          this.meeshoCredentials,
          MEESHO_API_PATHS.REPORTS,
          queryParams,
          MEESHO_RATE_LIMITS.REPORTS,
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
      'REGISTER_WEBHOOK not supported by Meesho API',
    );
  }

  async unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'UNREGISTER_WEBHOOK not supported by Meesho API',
    );
  }

  async listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse> {
    return this.createErrorResponse(
      context,
      'LIST_WEBHOOKS not supported by Meesho API',
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
        provider: 'meesho',
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
        provider: 'meesho',
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
