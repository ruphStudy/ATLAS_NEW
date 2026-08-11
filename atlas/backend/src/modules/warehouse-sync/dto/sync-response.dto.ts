import {
  IWarehouseSyncConfiguration,
  IWarehouseSyncJob,
  IWarehouseSyncConflict,
} from '../interfaces';

export type WarehouseSyncConfigurationResponseDto = IWarehouseSyncConfiguration;
export type WarehouseSyncJobResponseDto = IWarehouseSyncJob;
export type WarehouseSyncConflictResponseDto = IWarehouseSyncConflict;

export interface PaginatedWarehouseSyncConfigurationResponseDto {
  data: WarehouseSyncConfigurationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedWarehouseSyncJobResponseDto {
  data: WarehouseSyncJobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedWarehouseSyncConflictResponseDto {
  data: WarehouseSyncConflictResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SyncProgressResponseDto {
  jobId: string;
  status: string;
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  conflictItems: number;
  progressPercentage: number;
}
