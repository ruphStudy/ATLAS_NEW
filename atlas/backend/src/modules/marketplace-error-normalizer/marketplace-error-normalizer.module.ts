import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../common/constants';
import { DatabaseModule } from '../../database/database.module';
import { MarketplaceErrorNormalizerController } from './marketplace-error-normalizer.controller';
import { MarketplaceErrorNormalizerService } from './marketplace-error-normalizer.service';
import { ErrorNormalizerRepository } from './repository/error-normalizer.repository';
import { ErrorMapper } from './mapper/error.mapper';
import { ErrorDetector } from './detector/error.detector';
import { ErrorNormalizer } from './normalizer/error.normalizer';
import { ErrorEventQueue } from './events/error-event.queue';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MARKETPLACE_ERROR_EVENTS }),
  ],
  controllers: [MarketplaceErrorNormalizerController],
  providers: [
    MarketplaceErrorNormalizerService,
    ErrorNormalizerRepository,
    ErrorMapper,
    ErrorDetector,
    ErrorNormalizer,
    ErrorEventQueue,
  ],
  exports: [
    MarketplaceErrorNormalizerService,
    ErrorNormalizer,
    ErrorDetector,
    ErrorMapper,
    ErrorNormalizerRepository,
  ],
})
export class MarketplaceErrorNormalizerModule {}
