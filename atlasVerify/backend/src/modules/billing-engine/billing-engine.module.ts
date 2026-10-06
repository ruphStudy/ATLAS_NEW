import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { BillingEngineController } from './billing-engine.controller';
import { BillingEngineService } from './billing-engine.service';
import { BillingEngineRepository } from './billing-engine.repository';
import { BillingEngineEventQueue, BillingEngineEventWorker } from './jobs';

/**
 * BillingEngineModule — generates and tracks recurring/one-time billing
 * records (periods, line items, history) for a subscription, computing
 * proration/discount/credit/tax/overage/adjustment amounts from
 * caller-supplied and Plan/Subscription-resolved inputs. Deliberately
 * excludes any payment-provider/gateway integration — `recordPayment` only
 * records the RESULT of a charge collected elsewhere (the future Payment
 * Provider Framework); this module never initiates one. Tax rates,
 * proration strategy and overage prices are configuration-driven via
 * `BillingRule`, never hardcoded.
 */
@Module({
  imports: [
    DatabaseModule,
    SubscriptionManagementModule,
    PlanManagementModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.BILLING_ENGINE_EVENTS,
    }),
  ],
  controllers: [BillingEngineController],
  providers: [BillingEngineService, BillingEngineRepository, BillingEngineEventQueue, BillingEngineEventWorker],
  exports: [BillingEngineService],
})
export class BillingEngineModule {}
