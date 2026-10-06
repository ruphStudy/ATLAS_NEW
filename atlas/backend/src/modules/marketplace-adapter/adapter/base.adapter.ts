import {
  IAdapter,
  IAdapterConfig,
  IAdapterCredentials,
  IAdapterCapabilities,
  IAdapterHealthCheck,
  IAdapterConnectionTest,
  IRequestContext,
  IAdapterResponse,
  IPaginationParams,
  AdapterStatus,
  AdapterOperation,
} from '../interfaces';

export abstract class BaseAdapter implements IAdapter {
  protected config!: IAdapterConfig;
  protected credentials!: IAdapterCredentials;
  protected initialized: boolean = false;

  async initialize(
    config: IAdapterConfig,
    credentials: IAdapterCredentials,
  ): Promise<void> {
    this.config = config;
    this.credentials = credentials;
    await this.onInitialize();
    this.initialized = true;
  }

  protected abstract onInitialize(): Promise<void>;

  abstract getCapabilities(): IAdapterCapabilities;

  async healthCheck(): Promise<IAdapterHealthCheck> {
    const startTime = Date.now();
    try {
      const result = await this.performHealthCheck();
      return {
        status: AdapterStatus.ACTIVE,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        metadata: result,
      };
    } catch (error) {
      return {
        status: AdapterStatus.ERROR,
        lastChecked: new Date(),
        responseTime: Date.now() - startTime,
        errors: [
          {
            code: 'HEALTH_CHECK_FAILED',
            message: (error as Error).message,
          },
        ],
      };
    }
  }

  protected abstract performHealthCheck(): Promise<any>;

  async testConnection(): Promise<IAdapterConnectionTest> {
    const startTime = Date.now();
    try {
      await this.performConnectionTest();
      return {
        success: true,
        provider: this.config.provider,
        accountId: this.config.accountId,
        testedAt: new Date(),
        responseTime: Date.now() - startTime,
        capabilities: this.getCapabilities(),
      };
    } catch (error) {
      return {
        success: false,
        provider: this.config.provider,
        accountId: this.config.accountId,
        testedAt: new Date(),
        responseTime: Date.now() - startTime,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: (error as Error).message,
        },
      };
    }
  }

  protected abstract performConnectionTest(): Promise<void>;

  async destroy(): Promise<void> {
    await this.onDestroy();
    this.initialized = false;
  }

  protected abstract onDestroy(): Promise<void>;

  abstract getCatalog(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract updateCatalog(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract getInventory(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract updateInventory(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract getListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse>;

  abstract createListing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract updateListing(
    context: IRequestContext,
    listingId: string,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract deleteListing(
    context: IRequestContext,
    listingId: string,
  ): Promise<IAdapterResponse>;

  abstract listListings(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract getOrder(
    context: IRequestContext,
    orderId: string,
  ): Promise<IAdapterResponse>;

  abstract updateOrder(
    context: IRequestContext,
    orderId: string,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract listOrders(
    context: IRequestContext,
    params?: IPaginationParams & { startDate?: Date; endDate?: Date },
  ): Promise<IAdapterResponse>;

  abstract getShipment(
    context: IRequestContext,
    shipmentId: string,
  ): Promise<IAdapterResponse>;

  abstract createShipment(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract updateShipment(
    context: IRequestContext,
    shipmentId: string,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract listShipments(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract getReturn(
    context: IRequestContext,
    returnId: string,
  ): Promise<IAdapterResponse>;

  abstract processReturn(
    context: IRequestContext,
    returnId: string,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract listReturns(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract getPricing(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract updatePricing(
    context: IRequestContext,
    data: any,
  ): Promise<IAdapterResponse>;

  abstract getReport(
    context: IRequestContext,
    reportType: string,
    params?: any,
  ): Promise<IAdapterResponse>;

  abstract listReports(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  abstract registerWebhook(
    context: IRequestContext,
    data: { url: string; events: string[]; secret?: string },
  ): Promise<IAdapterResponse>;

  abstract unregisterWebhook(
    context: IRequestContext,
    webhookId: string,
  ): Promise<IAdapterResponse>;

  abstract listWebhooks(
    context: IRequestContext,
    params?: IPaginationParams,
  ): Promise<IAdapterResponse>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }
  }
}
