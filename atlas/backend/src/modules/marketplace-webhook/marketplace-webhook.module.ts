import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceAdapterModule } from '../marketplace-adapter/marketplace-adapter.module';

import { WebhookRepository } from './repository/webhook.repository';
import { WebhookValidator } from './validator/webhook.validator';
import { WebhookStateManager } from './state/webhook-state.manager';
import { WebhookEventQueue } from './events/webhook-events.queue';
import { WebhookProcessingQueue } from './queue/webhook-processing.queue';
import { WebhookMapper } from './mapper/webhook-mapper';
import { WebhookSignatureVerifier } from './signature/webhook-signature-verifier';
import { WebhookHandler } from './handler/webhook-handler';
import { WebhookMetrics } from './metrics/webhook.metrics';
import { MarketplaceWebhookService } from './marketplace-webhook.service';
import { MarketplaceWebhookController } from './marketplace-webhook.controller';
import { WebhookProcessingWorker } from './workers/webhook-processing.worker';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceAdapterModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.MARKETPLACE_WEBHOOK_EVENTS },
      { name: QUEUE_NAMES.MARKETPLACE_WEBHOOK_PROCESSING },
    ),
  ],
  controllers: [MarketplaceWebhookController],
  providers: [
    WebhookRepository,
    WebhookValidator,
    WebhookStateManager,
    WebhookEventQueue,
    WebhookProcessingQueue,
    WebhookMapper,
    WebhookSignatureVerifier,
    WebhookHandler,
    WebhookMetrics,
    MarketplaceWebhookService,
    WebhookProcessingWorker,
  ],
  exports: [
    MarketplaceWebhookService,
    WebhookMetrics,
    WebhookStateManager,
    WebhookRepository,
    WebhookHandler,
  ],
})
export class MarketplaceWebhookModule {}
