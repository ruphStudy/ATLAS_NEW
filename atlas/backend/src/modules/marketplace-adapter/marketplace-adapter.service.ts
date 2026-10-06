import { Injectable, Logger } from '@nestjs/common';
import { AdapterRegistry } from './registry/adapter.registry';
import { AdapterFactory } from './factory/adapter.factory';
import { AdapterHealthChecker } from './health/adapter-health.checker';
import {
  IAdapter,
  IAdapterConfig,
  IAdapterCredentials,
  IAdapterCapabilities,
  IAdapterHealthCheck,
  IAdapterConnectionTest,
  IRequestContext,
  IAdapterResponse,
  AdapterOperation,
} from './interfaces';

@Injectable()
export class MarketplaceAdapterService {
  private readonly logger = new Logger(MarketplaceAdapterService.name);

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly factory: AdapterFactory,
    private readonly healthChecker: AdapterHealthChecker,
  ) {}

  async initializeAdapter(
    config: IAdapterConfig,
    credentials: IAdapterCredentials,
  ): Promise<IAdapter> {
    this.logger.log(
      `Initializing adapter for ${config.provider}:${config.accountId}`,
    );

    const adapter = await this.factory.create(config.provider, config, credentials);

    this.logger.log(
      `Adapter initialized for ${config.provider}:${config.accountId}`,
    );

    return adapter;
  }

  async destroyAdapter(provider: string, accountId: string): Promise<void> {
    this.logger.log(`Destroying adapter for ${provider}:${accountId}`);
    await this.factory.destroy(provider, accountId);
  }

  async executeOperation(
    context: IRequestContext,
    parameters?: Record<string, any>,
    data?: any,
  ): Promise<IAdapterResponse> {
    const adapter = this.factory.get(context.provider, context.accountId);

    if (!adapter) {
      throw new Error(
        `Adapter not initialized for ${context.provider}:${context.accountId}`,
      );
    }

    switch (context.operation) {
      case AdapterOperation.GET_CATALOG:
        return adapter.getCatalog(context, parameters);

      case AdapterOperation.UPDATE_CATALOG:
        return adapter.updateCatalog(context, data);

      case AdapterOperation.GET_INVENTORY:
        return adapter.getInventory(context, parameters);

      case AdapterOperation.UPDATE_INVENTORY:
        return adapter.updateInventory(context, data);

      case AdapterOperation.GET_LISTING:
        return adapter.getListing(context, parameters?.listingId);

      case AdapterOperation.CREATE_LISTING:
        return adapter.createListing(context, data);

      case AdapterOperation.UPDATE_LISTING:
        return adapter.updateListing(context, parameters?.listingId, data);

      case AdapterOperation.DELETE_LISTING:
        return adapter.deleteListing(context, parameters?.listingId);

      case AdapterOperation.GET_ORDER:
        return adapter.getOrder(context, parameters?.orderId);

      case AdapterOperation.UPDATE_ORDER:
        return adapter.updateOrder(context, parameters?.orderId, data);

      case AdapterOperation.GET_SHIPMENT:
        return adapter.getShipment(context, parameters?.shipmentId);

      case AdapterOperation.CREATE_SHIPMENT:
        return adapter.createShipment(context, data);

      case AdapterOperation.UPDATE_SHIPMENT:
        return adapter.updateShipment(context, parameters?.shipmentId, data);

      case AdapterOperation.GET_RETURN:
        return adapter.getReturn(context, parameters?.returnId);

      case AdapterOperation.PROCESS_RETURN:
        return adapter.processReturn(context, parameters?.returnId, data);

      case AdapterOperation.GET_PRICING:
        return adapter.getPricing(context, parameters);

      case AdapterOperation.UPDATE_PRICING:
        return adapter.updatePricing(context, data);

      case AdapterOperation.GET_REPORT:
        return adapter.getReport(
          context,
          parameters?.reportType,
          parameters?.reportParams,
        );

      case AdapterOperation.REGISTER_WEBHOOK:
        return adapter.registerWebhook(context, data);

      case AdapterOperation.UNREGISTER_WEBHOOK:
        return adapter.unregisterWebhook(context, parameters?.webhookId);

      default:
        throw new Error(`Unsupported operation: ${context.operation}`);
    }
  }

  async getCapabilities(
    provider: string,
    accountId: string,
  ): Promise<IAdapterCapabilities> {
    const adapter = this.factory.get(provider, accountId);

    if (!adapter) {
      throw new Error(
        `Adapter not initialized for ${provider}:${accountId}`,
      );
    }

    return adapter.getCapabilities();
  }

  async healthCheck(
    provider: string,
    accountId: string,
  ): Promise<IAdapterHealthCheck> {
    return this.healthChecker.checkHealth(provider, accountId);
  }

  async testConnection(
    provider: string,
    accountId: string,
  ): Promise<IAdapterConnectionTest> {
    return this.healthChecker.testConnection(provider, accountId);
  }

  listRegisteredAdapters(): string[] {
    return this.registry.list();
  }

  hasAdapter(provider: string, accountId: string): boolean {
    return this.factory.has(provider, accountId);
  }

  registerAdapter(provider: string, adapter: new () => IAdapter): void {
    this.logger.log(`Registering adapter for provider: ${provider}`);
    this.registry.register(provider, adapter);
  }
}
