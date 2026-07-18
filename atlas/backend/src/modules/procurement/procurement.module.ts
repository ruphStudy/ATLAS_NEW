import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { ProcurementRepository } from './procurement.repository';
import { ProcurementQueue, ProcurementWorker } from './jobs';

@Module({
  imports: [DatabaseModule],
  controllers: [ProcurementController],
  providers: [ProcurementService, ProcurementRepository, ProcurementQueue, ProcurementWorker],
  exports: [ProcurementService],
})
export class ProcurementModule {}
