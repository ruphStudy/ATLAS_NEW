export const SEARCH_FRAMEWORK_MODULE = 'search-framework';

/** Roles permitted to register/unregister searchable entity types — a framework-catalog-level operation. */
export const SEARCH_REGISTRY_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Default/maximum page size for search results and facet buckets. */
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 100;
export const SEARCH_FACET_BUCKET_LIMIT = 10;

/** How long a resolved query's result page stays cached before being treated as stale. */
export const SEARCH_CACHE_TTL_MS = 60_000;

/** Cap on rows a single bulk-index call may enqueue in one request. */
export const MAX_BULK_INDEX_SIZE = 500;

/** Facet fields the framework always knows how to aggregate without any per-registration config. */
export const DEFAULT_FACET_FIELDS = ['entityType', 'status'] as const;
