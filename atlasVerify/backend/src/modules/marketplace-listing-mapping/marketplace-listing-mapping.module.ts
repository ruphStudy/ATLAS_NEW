import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceListingMappingController } from './marketplace-listing-mapping.controller';
import { MarketplaceListingMappingService } from './marketplace-listing-mapping.service';
import { MarketplaceListingMappingRepository } from './marketplace-listing-mapping.repository';
import { MarketplaceMappingRegistry } from './registry/marketplace-mapping.registry';
import { MarketplaceMappingFactory } from './registry/marketplace-mapping.factory';
import { CategoryMappingEngine } from './engines/category-mapping.engine';
import { AttributeMappingEngine } from './engines/attribute-mapping.engine';
import { VariantMappingEngine } from './engines/variant-mapping.engine';
import { ContentRuleEngine } from './engines/content-rule.engine';
import { MediaMappingEngine } from './engines/media-mapping.engine';
import { ValidationRuleEngine } from './engines/validation-rule.engine';
import { TransformationEngine } from './engines/transformation.engine';
import {
  MappingEventQueue,
  MappingEventWorker,
  TransformationQueue,
  TransformationWorker,
} from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [MarketplaceListingMappingController],
  providers: [
    // Core
    MarketplaceListingMappingService,
    MarketplaceListingMappingRepository,

    // Registry & Factory
    MarketplaceMappingRegistry,
    MarketplaceMappingFactory,

    // Engines
    CategoryMappingEngine,
    AttributeMappingEngine,
    VariantMappingEngine,
    ContentRuleEngine,
    MediaMappingEngine,
    ValidationRuleEngine,
    TransformationEngine,

    // Jobs
    MappingEventQueue,
    MappingEventWorker,
    TransformationQueue,
    TransformationWorker,
  ],
  exports: [
    MarketplaceListingMappingService,
    MarketplaceMappingRegistry,
    MarketplaceMappingFactory,
    TransformationEngine,
    ValidationRuleEngine,
    CategoryMappingEngine,
    AttributeMappingEngine,
  ],
})
export class MarketplaceListingMappingModule {}
