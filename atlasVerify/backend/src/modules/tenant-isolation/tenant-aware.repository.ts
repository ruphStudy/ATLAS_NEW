import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { TenantContextService } from './tenant-context.service';

/**
 * Opt-in base for NEW repositories that want automatic tenant scoping
 * without manually threading `workspaceId` through every query — every
 * `where` built via `scopedWhere()` has the current tenant's `workspaceId`
 * merged in (and cannot be overridden by the caller, since it's applied
 * last). Existing repositories are untouched; none are required to extend
 * this — it is purely additive infrastructure for modules built going
 * forward that want it.
 */
export abstract class TenantAwareRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    protected readonly tenantContextService: TenantContextService,
  ) {
    super(prisma);
  }

  /** Merges the current tenant's `workspaceId` into a Prisma `where` clause, overriding any caller-supplied value. */
  protected scopedWhere<T extends Record<string, unknown>>(where: T): T & { workspaceId: string } {
    const { workspaceId } = this.tenantContextService.getContextOrThrow();
    return { ...where, workspaceId };
  }

  /** Stamps `workspaceId` onto data being created, from the current tenant context — overriding any caller-supplied value. */
  protected scopedData<T extends Record<string, unknown>>(data: T): T & { workspaceId: string } {
    const { workspaceId } = this.tenantContextService.getContextOrThrow();
    return { ...data, workspaceId };
  }

  protected currentWorkspaceId(): string {
    return this.tenantContextService.getContextOrThrow().workspaceId;
  }
}
