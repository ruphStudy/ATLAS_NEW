import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';

/**
 * PricingModule
 *
 * Responsibilities:
 *   - Pricing rules & strategies
 *   - Cost calculation (COGS, fees, shipping)
 *   - Margin analysis
 *   - Dynamic repricing configuration
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [PricingController],
  providers: [PricingService, PricingRepository],
  exports: [PricingService],
})
export class PricingModule {}
