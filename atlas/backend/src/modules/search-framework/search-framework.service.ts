import { Injectable, Inject, Logger } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PrincipalType, PermissionEffect } from '@modules/roles-permissions/interfaces';
import { SearchFrameworkRepository } from './search-framework.repository';
import { SearchCacheService } from './search-cache.service';
import { SearchFrameworkEventQueue } from './jobs';
import { SEARCH_PROVIDER, ISearchProvider, ISearchProviderQuery } from './interfaces/search-provider.interface';
import {
  RegisterSearchEntityDto,
  IndexDocumentDto,
  BulkIndexDto,
  SearchQueryDto,
} from './dto';
import {
  ISearchEntityRegistration,
  ISearchDocument,
  ISearchResultPage,
  ISearchResultItem,
  ISearchFacetBucket,
  SearchMode,
  SearchFrameworkEvent,
} from './interfaces';
import { SEARCH_REGISTRY_MANAGE_ROLES, SEARCH_DEFAULT_LIMIT, SEARCH_FACET_BUCKET_LIMIT, DEFAULT_FACET_FIELDS } from './constants';
import {
  SearchEntityNotRegisteredException,
  SearchEntityAlreadyRegisteredException,
  SearchAccessDeniedException,
} from './exceptions/search-framework.exceptions';

const GLOBAL_ADMIN_ROLES = ['OWNER', 'ADMIN'];

@Injectable()
export class SearchFrameworkService {
  private readonly logger = new Logger(SearchFrameworkService.name);

  constructor(
    private readonly repository: SearchFrameworkRepository,
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
    private readonly cache: SearchCacheService,
    private readonly permissionResolver: PermissionResolverService,
    private readonly eventQueue: SearchFrameworkEventQueue,
  ) {}

  // ── Entity registry ──────────────────────────────────────────────

  async registerEntity(userRole: string, actorId: string, dto: RegisterSearchEntityDto): Promise<ISearchEntityRegistration> {
    this.assertCanManageRegistry(userRole);

    const existing = await this.repository.findRegistrationByKey(dto.key);
    if (existing) {
      throw new SearchEntityAlreadyRegisteredException(dto.key);
    }

    const registration = await this.repository.createRegistration({
      key: dto.key,
      module: dto.module,
      entityType: dto.entityType,
      displayName: dto.displayName,
      description: dto.description,
      searchableFields: dto.searchableFields ?? ['title', 'summary', 'content'],
      facetFields: dto.facetFields ?? [],
      requiredRoles: dto.requiredRoles ?? [],
      requiredPermissionKey: dto.requiredPermissionKey,
      isActive: true,
    });

    await this.publishEvent(SearchFrameworkEvent.ENTITY_REGISTERED, { module: dto.module, entityType: dto.entityType, actorId });
    return registration;
  }

  async unregisterEntity(key: string, userRole: string, actorId: string): Promise<void> {
    this.assertCanManageRegistry(userRole);
    const registration = await this.getRegistrationOrThrow(key);

    await this.repository.deleteRegistration(registration.id);
    await this.publishEvent(SearchFrameworkEvent.ENTITY_UNREGISTERED, {
      module: registration.module,
      entityType: registration.entityType,
      actorId,
    });
  }

  async listRegistrations(): Promise<ISearchEntityRegistration[]> {
    return this.repository.listRegistrations(false);
  }

  async getRegistration(key: string): Promise<ISearchEntityRegistration> {
    return this.getRegistrationOrThrow(key);
  }

  /** The existing query log, exposed read-only — lets consuming modules (e.g. Global Search) build "recent searches"/"search history" without a duplicate log of their own. */
  async getQueryHistory(workspaceId: string, userId?: string, limit?: number) {
    return this.repository.listQueryLogs(workspaceId, userId, limit);
  }

  // ── Indexing ─────────────────────────────────────────────────────

  async indexDocument(workspaceId: string, actorId: string, dto: IndexDocumentDto): Promise<ISearchDocument> {
    const doc = await this.searchProvider.index(this.toDocumentInput(workspaceId, dto));

    this.cache.invalidateWorkspace(workspaceId);
    await this.publishEvent(SearchFrameworkEvent.DOCUMENT_INDEXED, {
      workspaceId,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      actorId,
    });
    return doc;
  }

  async removeDocument(workspaceId: string, entityType: string, entityId: string, actorId: string): Promise<void> {
    await this.searchProvider.remove(workspaceId, entityType, entityId);
    this.cache.invalidateWorkspace(workspaceId);
    await this.publishEvent(SearchFrameworkEvent.DOCUMENT_REMOVED, { workspaceId, entityType, entityId, actorId });
  }

  async bulkIndex(workspaceId: string, actorId: string, dto: BulkIndexDto): Promise<{ queued: number }> {
    for (const document of dto.documents) {
      await this.eventQueue.enqueueIndexJob(workspaceId, this.toDocumentInput(workspaceId, document));
    }

    await this.publishEvent(SearchFrameworkEvent.BULK_INDEX_QUEUED, {
      workspaceId,
      actorId,
      metadata: { count: dto.documents.length },
    });
    return { queued: dto.documents.length };
  }

  /** Generic "resume owning-module workflows" contract — the owning module listens for this and re-pushes its own documents via `indexDocument`/`bulkIndex`. */
  async requestReindex(workspaceId: string, entityType: string, actorId: string): Promise<void> {
    await this.publishEvent(SearchFrameworkEvent.REINDEX_REQUESTED, { workspaceId, entityType, actorId });
  }

  // ── Query ────────────────────────────────────────────────────────

  async search(workspaceId: string, userId: string, userRole: string, dto: SearchQueryDto): Promise<ISearchResultPage> {
    const cacheKey = this.cache.buildKey(workspaceId, { ...dto, userRole } as unknown as Record<string, unknown>);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startedAt = Date.now();
    try {
      const hiddenEntityTypes = await this.resolveHiddenEntityTypes(userId, userRole, workspaceId);
      const page = dto.page ?? 1;
      const limit = dto.limit ?? SEARCH_DEFAULT_LIMIT;

      const providerQuery: ISearchProviderQuery = {
        workspaceId,
        q: dto.q,
        mode: dto.mode ?? SearchMode.PARTIAL,
        entityTypes: dto.entityTypes,
        excludeEntityTypes: hiddenEntityTypes,
        module: dto.module,
        tags: dto.tags,
        status: dto.status,
        ownerId: dto.ownerId,
        marketplace: dto.marketplace,
        warehouse: dto.warehouse,
        country: dto.country,
        dateFrom: dto.dateFrom ? new Date(dto.dateFrom) : undefined,
        dateTo: dto.dateTo ? new Date(dto.dateTo) : undefined,
        skip: (page - 1) * limit,
        take: limit,
      };

      const [result, facets] = await Promise.all([
        this.searchProvider.query(providerQuery),
        this.computeFacets(providerQuery),
      ]);

      const items = result.items.map((doc) => this.toResultItem(doc, dto.q));
      const resultPage: ISearchResultPage = {
        items,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        facets,
      };

      this.cache.set(cacheKey, resultPage);
      await this.repository.createQueryLog({
        workspaceId,
        userId,
        query: dto.q,
        filters: dto as unknown as Record<string, unknown>,
        resultCount: result.total,
        latencyMs: Date.now() - startedAt,
        failed: false,
      });
      await this.publishEvent(SearchFrameworkEvent.QUERY_EXECUTED, {
        workspaceId,
        actorId: userId,
        metadata: { resultCount: result.total, latencyMs: Date.now() - startedAt },
      });
      return resultPage;
    } catch (error) {
      await this.repository.createQueryLog({
        workspaceId,
        userId,
        query: dto.q,
        filters: dto as unknown as Record<string, unknown>,
        resultCount: 0,
        latencyMs: Date.now() - startedAt,
        failed: true,
        errorMessage: (error as Error).message,
      });
      await this.publishEvent(SearchFrameworkEvent.QUERY_FAILED, {
        workspaceId,
        actorId: userId,
        metadata: { errorMessage: (error as Error).message },
      });
      throw error;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private toDocumentInput(workspaceId: string, dto: IndexDocumentDto): Partial<ISearchDocument> {
    const content = [dto.title, dto.summary, dto.content].filter(Boolean).join(' ');
    return {
      workspaceId,
      organizationId: dto.organizationId,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      title: dto.title,
      summary: dto.summary,
      content,
      tags: dto.tags ?? [],
      status: dto.status,
      ownerId: dto.ownerId,
      marketplace: dto.marketplace,
      warehouse: dto.warehouse,
      country: dto.country,
      navigationRef: dto.navigationRef,
      metadata: dto.metadata ?? {},
    };
  }

  private toResultItem(doc: ISearchDocument, query?: string): ISearchResultItem {
    return {
      entityType: doc.entityType,
      entityId: doc.entityId,
      title: this.highlight(doc.title, query),
      summary: doc.summary ? this.highlight(doc.summary, query) : doc.summary,
      navigationRef: doc.navigationRef,
      tags: doc.tags,
      status: doc.status,
      score: 1,
    };
  }

  private highlight(text: string, query?: string): string {
    if (!query) {
      return text;
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  private async computeFacets(query: ISearchProviderQuery): Promise<Record<string, ISearchFacetBucket[]>> {
    const facets: Record<string, ISearchFacetBucket[]> = {};
    for (const field of DEFAULT_FACET_FIELDS) {
      facets[field] = await this.searchProvider.facet(field, query, SEARCH_FACET_BUCKET_LIMIT);
    }
    return facets;
  }

  private async resolveHiddenEntityTypes(userId: string, userRole: string, workspaceId: string): Promise<string[]> {
    if (GLOBAL_ADMIN_ROLES.includes(userRole)) {
      return [];
    }

    const registrations = await this.repository.listRegistrations(true);
    const hidden: string[] = [];
    let effectivePermissions: Array<{ key: string; effect: PermissionEffect }> | undefined;

    for (const registration of registrations) {
      if (registration.requiredRoles.length === 0 && !registration.requiredPermissionKey) {
        continue;
      }
      if (registration.requiredRoles.includes(userRole)) {
        continue;
      }
      if (registration.requiredPermissionKey) {
        if (!effectivePermissions) {
          effectivePermissions = await this.permissionResolver.getEffectivePermissions(
            workspaceId,
            PrincipalType.USER,
            userId,
          );
        }
        const allowed = effectivePermissions.some(
          (p) => p.key === registration.requiredPermissionKey && p.effect === PermissionEffect.ALLOW,
        );
        if (allowed) {
          continue;
        }
      }
      hidden.push(registration.entityType);
    }
    return hidden;
  }

  private async getRegistrationOrThrow(key: string): Promise<ISearchEntityRegistration> {
    const registration = await this.repository.findRegistrationByKey(key);
    if (!registration) {
      throw new SearchEntityNotRegisteredException(key);
    }
    return registration;
  }

  private assertCanManageRegistry(userRole: string): void {
    if (!SEARCH_REGISTRY_MANAGE_ROLES.includes(userRole)) {
      throw new SearchAccessDeniedException();
    }
  }

  private async publishEvent(
    event: SearchFrameworkEvent,
    opts: {
      workspaceId?: string;
      entityType?: string;
      entityId?: string;
      module?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
