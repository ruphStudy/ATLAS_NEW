import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderCapability,
  ProviderHealthResult,
  SupplierProviderCode,
} from './interfaces';
import { SupplierProviderRegistry } from './registry/supplier-provider.registry';
import { SupplierProviderHealthMonitor } from './health/supplier-provider-health.monitor';
import { ProviderMetadataResponseDto, ProviderHealthResponseDto } from './dto';

@Injectable()
export class SupplierProviderService {
  private readonly logger = new Logger(SupplierProviderService.name);

  constructor(
    private readonly registry: SupplierProviderRegistry,
    private readonly healthMonitor: SupplierProviderHealthMonitor,
  ) {}

  listProviders(): ProviderMetadataResponseDto[] {
    return this.registry.getAll().map((a) =>
      ProviderMetadataResponseDto.from(a.metadata),
    );
  }

  getProvider(providerCode: string): ProviderMetadataResponseDto {
    const adapter = this.registry.get(providerCode);
    return ProviderMetadataResponseDto.from(adapter.metadata);
  }

  listCapableProviders(capability: ProviderCapability): ProviderMetadataResponseDto[] {
    return this.registry
      .getCapable(capability)
      .map((a) => ProviderMetadataResponseDto.from(a.metadata));
  }

  async healthCheckAll(): Promise<ProviderHealthResponseDto[]> {
    const results = await this.healthMonitor.checkAll();
    return results.map((s) => ProviderHealthResponseDto.from(s.result));
  }

  async healthCheckProvider(providerCode: string): Promise<ProviderHealthResponseDto> {
    const adapter = this.registry.get(providerCode);
    const result = await this.healthMonitor.checkOne(adapter);
    return ProviderHealthResponseDto.from(result);
  }

  getCachedHealth(): ProviderHealthResponseDto[] {
    return this.healthMonitor
      .getAllHealth()
      .map((s) => ProviderHealthResponseDto.from(s.result));
  }
}
