import { Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './interfaces';
import { LocalFilesystemStorageProvider } from './providers/local-filesystem-storage.provider';

/**
 * StorageModule — generic, provider-agnostic file storage foundation for
 * the File Management module. Business code depends only on the
 * `STORAGE_PROVIDER` token / `IStorageProvider` contract, never on a
 * concrete provider class — swapping `LocalFilesystemStorageProvider` for
 * a remote provider later is a one-line change here, nowhere else.
 */
@Module({
  providers: [
    LocalFilesystemStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useExisting: LocalFilesystemStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
