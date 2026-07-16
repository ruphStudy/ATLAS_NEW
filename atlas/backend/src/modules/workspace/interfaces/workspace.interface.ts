import type { WorkspacePlan, WorkspaceStatus } from '@prisma/client';

/**
 * Extended Workspace type that includes fields added in the latest schema migration.
 * Prisma will expose these natively after `prisma generate`.
 */
export interface IWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  ownerId: string | null;
  status: WorkspaceStatus;
  plan: WorkspacePlan;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Generic list result – items type is intentionally flexible to avoid DTO↔interface circular deps
export interface IWorkspaceListResult {
  items: unknown[];
  total: number;
  page: number;
  limit: number;
}
