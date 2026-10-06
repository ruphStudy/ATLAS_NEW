import { Injectable } from '@nestjs/common';
import { IAdapter, IAdapterRegistry } from '../interfaces';

@Injectable()
export class AdapterRegistry implements IAdapterRegistry {
  private adapters: Map<string, new () => IAdapter> = new Map();

  register(provider: string, adapter: new () => IAdapter): void {
    if (this.adapters.has(provider)) {
      throw new Error(`Adapter for provider ${provider} already registered`);
    }
    this.adapters.set(provider, adapter);
  }

  get(provider: string): new () => IAdapter | undefined {
    return this.adapters.get(provider);
  }

  has(provider: string): boolean {
    return this.adapters.has(provider);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  unregister(provider: string): void {
    this.adapters.delete(provider);
  }

  clear(): void {
    this.adapters.clear();
  }
}
