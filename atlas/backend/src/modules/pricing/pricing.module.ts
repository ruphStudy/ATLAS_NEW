import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingRepository } from './pricing.repository';
import { PricingCalculationEngine } from './engines/pricing-calculation.engine';
import { PricingStrategyEngine } from './engines/pricing-strategy.engine';
import { PricingValidationEngine } from './engines/pricing-validation.engine';
import {
  PricingEventQueue,
  PricingEventWorker,
  PricingCalculationQueue,
  PricingCalculationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
    PricingCalculationEngine,
    PricingStrategyEngine,
    PricingValidationEngine,
    PricingEventQueue,
    PricingEventWorker,
    PricingCalculationQueue,
    PricingCalculationWorker,
  ],
  exports: [PricingService, PricingCalculationEngine, PricingStrategyEngine],
})
export class PricingModule {}
