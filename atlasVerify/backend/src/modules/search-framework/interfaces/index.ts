export * from './search-provider.interface';

export enum SearchMode {
  FULL_TEXT = 'FULL_TEXT',
  EXACT = 'EXACT',
  PREFIX = 'PREFIX',
  PARTIAL = 'PARTIAL',
}

export enum SearchFrameworkEvent {
  ENTITY_REGISTERED = 'search-framework.entity_registered',
  ENTITY_UNREGISTERED = 'search-framework.entity_unregistered',
  DOCUMENT_INDEXED = 'search-framework.document_indexed',
  DOCUMENT_REMOVED = 'search-framework.document_removed',
  BULK_INDEX_QUEUED = 'search-framework.bulk_index_queued',
  REINDEX_REQUESTED = 'search-framework.reindex_requested',
  QUERY_EXECUTED = 'search-framework.query_executed',
  QUERY_FAILED = 'search-framework.query_failed',
}

export interface ISearchEntityRegistration {
  id: string;
  key: string;
  module: string;
  entityType: string;
  displayName: string;
  description?: string | null;
  searchableFields: string[];
  facetFields: string[];
  requiredRoles: string[];
  requiredPermissionKey?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISearchDocument {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  summary?: string | null;
  content: string;
  tags: string[];
  status?: string | null;
  ownerId?: string | null;
  marketplace?: string | null;
  warehouse?: string | null;
  country?: string | null;
  navigationRef: unknown;
  metadata: unknown;
  indexedAt: Date;
  updatedAt: Date;
}

export interface ISearchQueryLog {
  id: string;
  workspaceId: string;
  userId?: string | null;
  query?: string | null;
  filters?: unknown;
  resultCount: number;
  latencyMs: number;
  failed: boolean;
  errorMessage?: string | null;
  createdAt: Date;
}

export interface ISearchResultItem {
  entityType: string;
  entityId: string;
  title: string;
  summary?: string | null;
  navigationRef: unknown;
  tags: string[];
  status?: string | null;
  score: number;
}

export interface ISearchFacetBucket {
  value: string;
  count: number;
}

export interface ISearchResultPage {
  items: ISearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Record<string, ISearchFacetBucket[]>;
}

export interface ISearchQuery {
  workspaceId: string;
  q?: string;
  mode?: SearchMode;
  entityTypes?: string[];
  module?: string;
  tags?: string[];
  status?: string;
  ownerId?: string;
  marketplace?: string;
  warehouse?: string;
  country?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ISearchFrameworkEventPayload {
  event: SearchFrameworkEvent;
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
