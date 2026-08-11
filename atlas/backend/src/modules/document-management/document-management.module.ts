import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { FileManagementModule } from '@modules/file-management/file-management.module';
import { DocumentManagementController } from './document-management.controller';
import { DocumentManagementService } from './document-management.service';
import { DocumentManagementRepository } from './document-management.repository';
import { DocumentEventQueue, DocumentEventWorker } from './jobs';

/**
 * DocumentManagementModule — document lifecycle, classification and
 * approval workflow for supplier/procurement/PO/shipment/quality/product/
 * marketplace/warehouse/finance/SaaS documents. All file bytes and secure
 * access are delegated entirely to `FileManagementModule` via
 * `Document.fileId` — this module never touches storage directly.
 */
@Module({
  imports: [
    DatabaseModule,
    FileManagementModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.DOCUMENT_EVENTS,
    }),
  ],
  controllers: [DocumentManagementController],
  providers: [
    DocumentManagementService,
    DocumentManagementRepository,
    DocumentEventQueue,
    DocumentEventWorker,
  ],
  exports: [DocumentManagementService, DocumentManagementRepository],
})
export class DocumentManagementModule {}
