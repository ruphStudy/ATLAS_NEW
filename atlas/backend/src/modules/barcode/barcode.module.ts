import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { BarcodeController } from './barcode.controller';
import { BarcodeService } from './barcode.service';
import { BarcodeRepository } from './barcode.repository';
import { BarcodeEventQueue, BarcodeEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: 'barcode-events',
    }),
  ],
  controllers: [BarcodeController],
  providers: [BarcodeService, BarcodeRepository, BarcodeEventQueue, BarcodeEventWorker],
  exports: [BarcodeService, BarcodeRepository],
})
export class BarcodeModule {}
