import { Injectable, Logger } from '@nestjs/common';
import { ShippingCapability } from './interfaces';
import { ShippingProviderRegistry } from './registry/shipping-provider.registry';
import { ShippingProviderHealthMonitor } from './health/shipping-provider-health.monitor';
import { ShippingProviderHealthResponseDto, ShippingProviderMetadataResponseDto } from './dto';

@Injectable()
export class ShippingProviderService {
  private readonly logger = new Logger(ShippingProviderService.name);

  constructor(
    private readonly registry: ShippingProviderRegistry,
    private readonly healthMonitor: ShippingProviderHealthMonitor,
  ) {}

  listProviders(): ShippingProviderMetadataResponseDto[] {
    return this.registry.getAll().map((a) => ShippingProviderMetadataResponseDto.from(a.metadata));
  }

  getProvider(providerKey: string): ShippingProviderMetadataResponseDto {
    return ShippingProviderMetadataResponseDto.from(this.registry.get(providerKey).metadata);
  }

  listCapableProviders(capability: ShippingCapability): ShippingProviderMetadataResponseDto[] {
    return this.registry.getCapable(capability).map((a) => ShippingProviderMetadataResponseDto.from(a.metadata));
  }

  async healthCheckAll(): Promise<ShippingProviderHealthResponseDto[]> {
    const results = await this.healthMonitor.checkAll();
    return results.map((s) => ShippingProviderHealthResponseDto.from(s.result));
  }

  async healthCheckProvider(providerKey: string): Promise<ShippingProviderHealthResponseDto> {
    const adapter = this.registry.get(providerKey);
    const result = await this.healthMonitor.checkOne(adapter);
    return ShippingProviderHealthResponseDto.from(result);
  }

  getCachedHealth(): ShippingProviderHealthResponseDto[] {
    return this.healthMonitor.getAllHealth().map((s) => ShippingProviderHealthResponseDto.from(s.result));
  }
}
