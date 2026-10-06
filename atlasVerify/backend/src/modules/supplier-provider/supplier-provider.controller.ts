import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { SupplierProviderService } from './supplier-provider.service';

@UseGuards(JwtAuthGuard)
@Controller('supplier-providers')
export class SupplierProviderController {
  constructor(private readonly service: SupplierProviderService) {}

  @Get()
  listProviders() {
    return this.service.listProviders();
  }

  @Get(':providerCode')
  getProvider(@Param('providerCode') providerCode: string) {
    return this.service.getProvider(providerCode);
  }

  @Get('health/all')
  getCachedHealth() {
    return this.service.getCachedHealth();
  }

  @Post('health/check')
  healthCheckAll() {
    return this.service.healthCheckAll();
  }

  @Post('health/check/:providerCode')
  healthCheckProvider(@Param('providerCode') providerCode: string) {
    return this.service.healthCheckProvider(providerCode);
  }
}
