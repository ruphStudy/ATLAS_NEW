export class SearchEntityRegistrationResponseDto {
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

export class SearchResultItemResponseDto {
  entityType: string;
  entityId: string;
  title: string;
  summary?: string | null;
  navigationRef: unknown;
  tags: string[];
  status?: string | null;
  score: number;
}

export class SearchFacetBucketResponseDto {
  value: string;
  count: number;
}

export class SearchResultPageResponseDto {
  items: SearchResultItemResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Record<string, SearchFacetBucketResponseDto[]>;
}

export class SearchQueryLogResponseDto {
  id: string;
  query?: string | null;
  filters?: unknown;
  resultCount: number;
  latencyMs: number;
  failed: boolean;
  createdAt: Date;
}
