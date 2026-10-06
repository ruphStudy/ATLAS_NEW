import { Injectable } from '@nestjs/common';
import { SearchFrameworkService } from '@modules/search-framework/search-framework.service';
import { SearchQueryDto } from '@modules/search-framework/dto';
import { SearchMode, ISearchResultItem } from '@modules/search-framework/interfaces';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { ActivityFilterDto, RecordActivityDto } from '@modules/activity-center/dto';
import { ActivityActorType, ActivityOutcome } from '@modules/activity-center/interfaces';
import { GlobalSearchRepository } from './global-search.repository';
import { GlobalSearchEventQueue } from './jobs';
import { CreateSavedSearchDto, UpdateSavedSearchDto, OpenResultDto } from './dto';
import {
  IGlobalSavedSearch,
  IGlobalSearchResponse,
  IGlobalSearchResultItem,
  IQuickAction,
  GlobalSearchEvent,
} from './interfaces';
import { GLOBAL_SEARCH_MODULE, DEFAULT_RECENT_LIMIT, DEFAULT_SUGGESTION_LIMIT } from './constants';
import {
  GlobalSavedSearchNotFoundException,
  GlobalSearchAccessDeniedException,
} from './exceptions/global-search.exceptions';

@Injectable()
export class GlobalSearchService {
  constructor(
    private readonly repository: GlobalSearchRepository,
    private readonly searchFrameworkService: SearchFrameworkService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly eventQueue: GlobalSearchEventQueue,
  ) {}

  // ── Query ────────────────────────────────────────────────────────

  async search(workspaceId: string, userId: string, userRole: string, dto: SearchQueryDto): Promise<IGlobalSearchResponse> {
    const [result, entityTypeToModule] = await Promise.all([
      this.searchFrameworkService.search(workspaceId, userId, userRole, dto),
      this.buildEntityTypeToModuleMap(),
    ]);

    const items = result.items.map((item) => this.toGlobalItem(item, entityTypeToModule));
    const groupedByEntityType: Record<string, IGlobalSearchResultItem[]> = {};
    const groupedByModule: Record<string, IGlobalSearchResultItem[]> = {};
    for (const item of items) {
      (groupedByEntityType[item.entityType] ??= []).push(item);
      const moduleKey = item.module ?? 'unclassified';
      (groupedByModule[moduleKey] ??= []).push(item);
    }

    if (result.total === 0) {
      await this.publishEvent(GlobalSearchEvent.SEARCH_ZERO_RESULTS, { workspaceId, userId, metadata: { q: dto.q } });
    }
    await this.publishEvent(GlobalSearchEvent.SEARCH_EXECUTED, {
      workspaceId,
      userId,
      metadata: { q: dto.q, total: result.total },
    });

    return {
      items,
      groupedByEntityType,
      groupedByModule,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      facets: result.facets,
    };
  }

  async getSuggestions(workspaceId: string, userId: string, userRole: string, q: string, limit = DEFAULT_SUGGESTION_LIMIT): Promise<string[]> {
    const [liveResult, recentSearches] = await Promise.all([
      this.searchFrameworkService.search(workspaceId, userId, userRole, {
        q,
        mode: SearchMode.PREFIX,
        limit,
      } as SearchQueryDto),
      this.getRecentSearches(workspaceId, userId, limit),
    ]);

    const titles = liveResult.items.map((item) => this.stripHighlight(item.title));
    const matchingRecents = recentSearches
      .map((r) => r.query)
      .filter((value): value is string => !!value && value.toLowerCase().startsWith(q.toLowerCase()));

    return [...new Set([...matchingRecents, ...titles])].slice(0, limit);
  }

  // ── Recent searches / history (reuses the Search Framework's own query log) ──

  async getRecentSearches(
    workspaceId: string,
    userId: string,
    limit = DEFAULT_RECENT_LIMIT,
  ): Promise<Array<{ query?: string | null; lastSearchedAt: Date }>> {
    const logs = await this.searchFrameworkService.getQueryHistory(workspaceId, userId, limit * 3);
    const seen = new Set<string>();
    const recents: Array<{ query?: string | null; lastSearchedAt: Date }> = [];

    for (const log of logs) {
      if (!log.query || seen.has(log.query)) {
        continue;
      }
      seen.add(log.query);
      recents.push({ query: log.query, lastSearchedAt: log.createdAt });
      if (recents.length >= limit) {
        break;
      }
    }
    return recents;
  }

  async getSearchHistory(workspaceId: string, userId: string, limit = DEFAULT_RECENT_LIMIT) {
    return this.searchFrameworkService.getQueryHistory(workspaceId, userId, limit);
  }

  // ── Recent entities (reuses the Activity Center's personal feed) ────

  async openResult(workspaceId: string, userId: string, dto: OpenResultDto): Promise<void> {
    const activityDto: RecordActivityDto = {
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId: userId,
      action: 'global-search.result_opened',
      sourceModule: GLOBAL_SEARCH_MODULE,
      entityType: dto.entityType,
      entityId: dto.entityId,
      outcome: ActivityOutcome.SUCCESS,
      title: dto.title ?? 'Opened from search',
      recipientUserId: userId,
      metadata: dto.navigationRef ? { navigationRef: dto.navigationRef } : undefined,
    } as RecordActivityDto;
    await this.activityCenterService.record(activityDto);

    await this.publishEvent(GlobalSearchEvent.RESULT_OPENED, {
      workspaceId,
      userId,
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
  }

  async getRecentEntities(
    workspaceId: string,
    userId: string,
    limit = DEFAULT_RECENT_LIMIT,
  ): Promise<Array<{ entityType: string; entityId: string; title: string; lastOpenedAt: Date }>> {
    const feed = await this.activityCenterService.findPersonalFeed(workspaceId, userId, {
      sourceModule: GLOBAL_SEARCH_MODULE,
      page: 1,
      limit: limit * 3,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as ActivityFilterDto);

    const seen = new Set<string>();
    const recents: Array<{ entityType: string; entityId: string; title: string; lastOpenedAt: Date }> = [];
    for (const entry of feed.data as any[]) {
      if (!entry.entityType || !entry.entityId) {
        continue;
      }
      const key = `${entry.entityType}:${entry.entityId}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      recents.push({ entityType: entry.entityType, entityId: entry.entityId, title: entry.title, lastOpenedAt: entry.createdAt });
      if (recents.length >= limit) {
        break;
      }
    }
    return recents;
  }

  // ── Saved searches ───────────────────────────────────────────────

  async createSavedSearch(workspaceId: string, userId: string, dto: CreateSavedSearchDto): Promise<IGlobalSavedSearch> {
    const savedSearch = await this.repository.createSavedSearch({
      workspaceId,
      userId,
      name: dto.name,
      query: dto.query,
      filters: dto.filters ?? {},
      isShared: dto.isShared ?? false,
    });

    await this.publishEvent(GlobalSearchEvent.SAVED_SEARCH_CREATED, { workspaceId, userId, metadata: { id: savedSearch.id } });
    return savedSearch;
  }

  async listSavedSearches(workspaceId: string, userId: string): Promise<IGlobalSavedSearch[]> {
    return this.repository.listSavedSearches(workspaceId, userId);
  }

  async updateSavedSearch(id: string, workspaceId: string, userId: string, dto: UpdateSavedSearchDto): Promise<IGlobalSavedSearch> {
    const savedSearch = await this.getSavedSearchOrThrow(id, workspaceId);
    if (savedSearch.userId !== userId) {
      throw new GlobalSearchAccessDeniedException();
    }

    return this.repository.updateSavedSearch(id, {
      name: dto.name,
      query: dto.query,
      filters: dto.filters,
      isShared: dto.isShared,
    } as Partial<IGlobalSavedSearch>);
  }

  async deleteSavedSearch(id: string, workspaceId: string, userId: string): Promise<void> {
    const savedSearch = await this.getSavedSearchOrThrow(id, workspaceId);
    if (savedSearch.userId !== userId) {
      throw new GlobalSearchAccessDeniedException();
    }

    await this.repository.deleteSavedSearch(id);
    await this.publishEvent(GlobalSearchEvent.SAVED_SEARCH_DELETED, { workspaceId, userId, metadata: { id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async buildEntityTypeToModuleMap(): Promise<Map<string, string>> {
    const registrations = await this.searchFrameworkService.listRegistrations();
    const map = new Map<string, string>();
    for (const registration of registrations) {
      map.set(registration.entityType, registration.module);
    }
    return map;
  }

  private toGlobalItem(item: ISearchResultItem, entityTypeToModule: Map<string, string>): IGlobalSearchResultItem {
    return {
      entityType: item.entityType,
      entityId: item.entityId,
      module: entityTypeToModule.get(item.entityType),
      title: item.title,
      summary: item.summary,
      navigationRef: item.navigationRef,
      tags: item.tags,
      status: item.status,
      score: item.score,
      quickActions: this.buildQuickActions(item),
    };
  }

  private buildQuickActions(item: ISearchResultItem): IQuickAction[] {
    return [{ action: 'view', label: 'View', navigationRef: item.navigationRef }];
  }

  private stripHighlight(text: string): string {
    return text.replace(/<\/?mark>/g, '');
  }

  private async getSavedSearchOrThrow(id: string, workspaceId: string): Promise<IGlobalSavedSearch> {
    const savedSearch = await this.repository.findSavedSearchById(id);
    if (!savedSearch || savedSearch.workspaceId !== workspaceId) {
      throw new GlobalSavedSearchNotFoundException(id);
    }
    return savedSearch;
  }

  private async publishEvent(
    event: GlobalSearchEvent,
    opts: { workspaceId: string; userId?: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
