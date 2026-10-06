import { FileCategory } from '../interfaces';

/** Allow-listed mime types, grouped by the category they resolve to when not explicitly provided. */
export const ALLOWED_MIME_TYPES: Record<string, FileCategory> = {
  'application/pdf': FileCategory.PDF,
  'application/msword': FileCategory.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileCategory.DOCUMENT,
  'text/plain': FileCategory.DOCUMENT,
  'text/csv': FileCategory.SPREADSHEET,
  'application/vnd.ms-excel': FileCategory.SPREADSHEET,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileCategory.SPREADSHEET,
  'image/png': FileCategory.IMAGE,
  'image/jpeg': FileCategory.IMAGE,
  'image/gif': FileCategory.IMAGE,
  'image/webp': FileCategory.IMAGE,
  'image/svg+xml': FileCategory.IMAGE,
  'application/zip': FileCategory.EXPORT,
  'application/json': FileCategory.EXPORT,
  'application/octet-stream': FileCategory.OTHER,
};

/** Maximum number of file ids accepted by a single bulk operation call. */
export const MAX_BULK_OPERATION_SIZE = 100;

/** Maximum number of version snapshots returned by the version-history endpoint. */
export const MAX_VERSION_HISTORY_ROWS = 200;
