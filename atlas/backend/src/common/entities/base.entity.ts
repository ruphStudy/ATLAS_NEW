/**
 * BaseEntity
 *
 * Abstract type that documents the audit fields present on every
 * Prisma model in ATLAS (DB-004). Not an ORM entity — Prisma manages
 * the database layer. This provides compile-time documentation and
 * a shared contract for mapping functions.
 */
export abstract class BaseEntity {
  abstract id: string;
  abstract createdAt: Date;
  abstract updatedAt: Date;
  abstract deletedAt: Date | null;
}

/**
 * AuditFields
 *
 * Utility type for spread-applying audit fields to response DTOs.
 */
export interface AuditFields {
  createdAt: string;
  updatedAt: string;
}

/**
 * softDeleted
 *
 * Type guard that returns true if the entity has been soft-deleted.
 */
export function isSoftDeleted(entity: { deletedAt: Date | null }): boolean {
  return entity.deletedAt !== null;
}
