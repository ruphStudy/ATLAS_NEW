import { Controller, Get, Param, Post } from '@nestjs/common';
import { ShippingProviderService } from './shipping-provider.service';

@Controller('shipping-providers')
export class ShippingProviderController {
  constructor(private readonly service: ShippingProviderService) {}

  @Get()
  listProviders() {
    return this.service.listProviders();
  }

  @Get('health/all')
  getCachedHealth() {
    return this.service.getCachedHealth();
  }

  @Post('health/check')
  healthCheckAll() {
    return this.service.healthCheckAll();
  }

  @Post('health/check/:providerKey')
  healthCheckProvider(@Param('providerKey') providerKey: string) {
    return this.service.healthCheckProvider(providerKey);
  }

  @Get(':providerKey')
  getProvider(@Param('providerKey') providerKey: string) {
    return this.service.getProvider(providerKey);
  }
}
