import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderRepository } from './purchase-order.repository';
import { PurchaseOrderQueue, PurchaseOrderWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService, PurchaseOrderRepository, PurchaseOrderQueue, PurchaseOrderWorker],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
