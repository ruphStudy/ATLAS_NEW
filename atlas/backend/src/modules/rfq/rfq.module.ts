import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderModule } from '@modules/supplier-provider/supplier-provider.module';
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { RfqController } from './rfq.controller';
import { RfqService } from './rfq.service';
import { RfqRepository } from './rfq.repository';
import { RfqNotificationQueue, RfqNotificationWorker } from './jobs';

@Module({
  imports: [DatabaseModule, SupplierProviderModule, SuppliersModule],
  controllers: [RfqController],
  providers: [RfqService, RfqRepository, RfqNotificationQueue, RfqNotificationWorker],
  exports: [RfqService],
})
export class RfqModule {}
