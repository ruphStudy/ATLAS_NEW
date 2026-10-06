import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { StorageModule } from '../../storage/storage.module';
import { FileManagementController } from './file-management.controller';
import { FileManagementService } from './file-management.service';
import { FileManagementRepository } from './file-management.repository';
import { FileEventQueue, FileEventWorker } from './jobs';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.FILE_EVENTS,
    }),
  ],
  controllers: [FileManagementController],
  providers: [FileManagementService, FileManagementRepository, FileEventQueue, FileEventWorker],
  exports: [FileManagementService, FileManagementRepository],
})
export class FileManagementModule {}
