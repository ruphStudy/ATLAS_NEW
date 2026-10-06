export class QuickActionResponseDto {
  action: string;
  label: string;
  navigationRef: unknown;
}

export class GlobalSearchResultItemResponseDto {
  entityType: string;
  entityId: string;
  module?: string;
  title: string;
  summary?: string | null;
  navigationRef: unknown;
  tags: string[];
  status?: string | null;
  score: number;
  quickActions: QuickActionResponseDto[];
}

export class GlobalSearchResponseDto {
  items: GlobalSearchResultItemResponseDto[];
  groupedByEntityType: Record<string, GlobalSearchResultItemResponseDto[]>;
  groupedByModule: Record<string, GlobalSearchResultItemResponseDto[]>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
}

export class SavedSearchResponseDto {
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

export class RecentEntityResponseDto {
  entityType: string;
  entityId: string;
  title: string;
  lastOpenedAt: Date;
}

export class RecentSearchResponseDto {
  query?: string | null;
  lastSearchedAt: Date;
}
