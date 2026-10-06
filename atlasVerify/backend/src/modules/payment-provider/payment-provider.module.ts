import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { PaymentProviderController } from './payment-provider.controller';
import { PaymentProviderService } from './payment-provider.service';
import { PaymentProviderRepository } from './payment-provider.repository';
import { PaymentProviderRegistry } from './registry/payment-provider.registry';
import { PaymentProviderFactory } from './registry/payment-provider.factory';
import { PaymentCredentialEncryptor } from './credentials/payment-credential.encryptor';
import { PaymentCredentialDecryptor } from './credentials/payment-credential.decryptor';
import { StripePaymentAdapter } from './adapters/stripe-payment.adapter';
import { RazorpayPaymentAdapter } from './adapters/razorpay-payment.adapter';
import { PaymentProviderHealthService } from './health/payment-provider-health.service';
import { PaymentConnectionTestService } from './connection-test/payment-connection-test.service';
import { PaymentWebhookService } from './webhook/payment-webhook.service';
import { PaymentErrorNormalizer } from './errors/payment-error-normalizer';
import { PaymentProviderEventQueue, PaymentProviderEventWorker } from './jobs';

/**
 * PaymentProviderModule — the generic payment-provider framework: a
 * registry+factory selection layer (mirroring `MarketplaceProviderRegistry`/
 * `MarketplaceProviderFactory`), AES-256-GCM credential encryption
 * (mirroring `MarketplaceCredentialEncryptor`), adapter-delegated
 * health/connection-test (mirroring `MarketplaceHealthMonitorService`/
 * `MarketplaceConnectionTestService`), and webhook signature
 * verification+normalization. All Stripe/Razorpay-specific request shapes,
 * auth and error parsing live inside their own adapter files — nothing
 * else in this module (or outside it) knows those APIs exist.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS,
    }),
  ],
  controllers: [PaymentProviderController],
  providers: [
    PaymentProviderService,
    PaymentProviderRepository,
    PaymentProviderRegistry,
    PaymentProviderFactory,
    PaymentCredentialEncryptor,
    PaymentCredentialDecryptor,
    StripePaymentAdapter,
    RazorpayPaymentAdapter,
    PaymentProviderHealthService,
    PaymentConnectionTestService,
    PaymentWebhookService,
    PaymentErrorNormalizer,
    PaymentProviderEventQueue,
    PaymentProviderEventWorker,
  ],
  exports: [PaymentProviderService, PaymentProviderRegistry],
})
export class PaymentProviderModule implements OnModuleInit {
  constructor(
    private readonly registry: PaymentProviderRegistry,
    private readonly stripeAdapter: StripePaymentAdapter,
    private readonly razorpayAdapter: RazorpayPaymentAdapter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.stripeAdapter);
    this.registry.register(this.razorpayAdapter);
  }
}
