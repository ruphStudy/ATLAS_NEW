import { ISearchDocument, SearchMode } from './index';

export interface ISearchProviderQuery {
  workspaceId: string;
  entityTypes?: string[];
  excludeEntityTypes?: string[];
  module?: string;
  tags?: string[];
  status?: string;
  ownerId?: string;
  marketplace?: string;
  warehouse?: string;
  country?: string;
  dateFrom?: Date;
  dateTo?: Date;
  q?: string;
  mode: SearchMode;
  skip: number;
  take: number;
}

export interface ISearchProviderResult {
  items: ISearchDocument[];
  total: number;
}

/**
 * Generic search storage/provider contract. The default implementation
 * (`PostgresSearchProvider`) queries the `SearchDocument` table via Prisma;
 * swapping in a dedicated search engine later is a one-line change at the
 * `SEARCH_PROVIDER` binding in `SearchFrameworkModule` — callers never
 * depend on the concrete provider class, only on this interface (mirrors
 * File Management's `IStorageProvider` pattern).
 */
export interface ISearchProvider {
  index(doc: Partial<ISearchDocument>): Promise<ISearchDocument>;
  remove(workspaceId: string, entityType: string, entityId: string): Promise<void>;
  query(query: ISearchProviderQuery): Promise<ISearchProviderResult>;
  /** Aggregate counts for a single scalar facet field, under the same base filters as `query`. */
  facet(field: string, query: ISearchProviderQuery, limit: number): Promise<Array<{ value: string; count: number }>>;
}

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');
