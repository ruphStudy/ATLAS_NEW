export enum GlobalSearchEvent {
  SEARCH_EXECUTED = 'global-search.search_executed',
  SEARCH_ZERO_RESULTS = 'global-search.zero_results',
  SEARCH_FAILED = 'global-search.search_failed',
  RESULT_OPENED = 'global-search.result_opened',
  SAVED_SEARCH_CREATED = 'global-search.saved_search_created',
  SAVED_SEARCH_DELETED = 'global-search.saved_search_deleted',
}

export interface IGlobalSavedSearch {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  query?: string | null;
  filters: unknown;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuickAction {
  action: string;
  label: string;
  navigationRef: unknown;
}

export interface IGlobalSearchResultItem {
  entityType: string;
  entityId: string;
  module?: string;
  title: string;
  summary?: string | null;
  navigationRef: unknown;
  tags: string[];
  status?: string | null;
  score: number;
  quickActions: IQuickAction[];
}

export interface IGlobalSearchResponse {
  items: IGlobalSearchResultItem[];
  groupedByEntityType: Record<string, IGlobalSearchResultItem[]>;
  groupedByModule: Record<string, IGlobalSearchResultItem[]>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
}

export interface IGlobalSearchEventPayload {
  event: GlobalSearchEvent;
  workspaceId: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
