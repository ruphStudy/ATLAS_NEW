import { Injectable } from '@nestjs/common';
import { AdapterRegistry } from '../registry/adapter.registry';
import {
  IAdapter,
  IAdapterFactory,
  IAdapterConfig,
  IAdapterCredentials,
} from '../interfaces';

@Injectable()
export class AdapterFactory implements IAdapterFactory {
  private instances: Map<string, IAdapter> = new Map();

  constructor(private readonly registry: AdapterRegistry) {}

  async create(
    provider: string,
    config: IAdapterConfig,
    credentials: IAdapterCredentials,
  ): Promise<IAdapter> {
    const key = this.getInstanceKey(provider, config.accountId);

    const existing = this.instances.get(key);
    if (existing) {
      return existing;
    }

    const AdapterClass = this.registry.get(provider);
    if (!AdapterClass) {
      throw new Error(`Adapter for provider ${provider} not found`);
    }

    const adapter = new AdapterClass();
    await adapter.initialize(config, credentials);

    this.instances.set(key, adapter);

    return adapter;
  }

  async destroy(provider: string, accountId: string): Promise<void> {
    const key = this.getInstanceKey(provider, accountId);
    const adapter = this.instances.get(key);

    if (adapter) {
      await adapter.destroy();
      this.instances.delete(key);
    }
  }

  async destroyAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map((adapter) =>
      adapter.destroy(),
    );
    await Promise.all(promises);
    this.instances.clear();
  }

  private getInstanceKey(provider: string, accountId: string): string {
    return `${provider}:${accountId}`;
  }

  has(provider: string, accountId: string): boolean {
    const key = this.getInstanceKey(provider, accountId);
    return this.instances.has(key);
  }

  get(provider: string, accountId: string): IAdapter | undefined {
    const key = this.getInstanceKey(provider, accountId);
    return this.instances.get(key);
  }
}
