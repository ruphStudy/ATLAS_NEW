// Shared TypeScript types for the frontend
// API contract types and domain types go here.

// ── API Response Envelope ──────────────────────────────────
// The raw shape every backend response is wrapped in (see the backend's
// `TransformInterceptor`). `apiClient`'s response interceptor
// (`lib/api/axios.ts`) already unwraps this automatically, so service
// functions consume the inner `data` payload directly — this type exists
// for reference / for any call site that bypasses `apiClient`.
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, unknown>;
  timestamp: string;
  requestId: string;
}

/** Common paginated-list shape used across ATLAS modules: `{ data, total, page, limit, totalPages }`. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ── Pagination Query Params ────────────────────────────────
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ── User & Auth ────────────────────────────────────────────
export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'ANALYST' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export interface User {
  id: string;
  workspaceId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  timezone: string;
  locale: string;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Not returned by `GET /users/:id` today — only populated on the auth session (`AuthUser`) from login/register. */
  isPlatformAdmin?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  /** Requires OWNER/ADMIN to change on another user. */
  role?: UserRole;
  /** Requires OWNER/ADMIN to change on another user. */
  status?: UserStatus;
}

export type UserFilterParams = PaginationParams;

export interface UserListResult {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

// ── Workspace ──────────────────────────────────────────────
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED' | 'ARCHIVED';
export type WorkspacePlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type WorkspaceOnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  ownerId?: string | null;
  status: WorkspaceStatus;
  plan: WorkspacePlan;
  organizationId?: string | null;
  onboardingStatus?: WorkspaceOnboardingStatus;
  archivedAt?: string | null;
  suspendedAt?: string | null;
  suspendedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProfile {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  status: string;
  plan: string;
  organizationId?: string | null;
  onboardingStatus: string;
  timezone: string;
  locale: string;
  currency: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
  logoUrl?: string;
}

export type UpdateWorkspacePayload = Partial<CreateWorkspacePayload> & { status?: WorkspaceStatus };

export interface WorkspaceListResult {
  items: Workspace[];
  total: number;
  page: number;
  limit: number;
}

// ── Workspace membership / invitations ──────────────────────
export type WorkspaceMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'SERVICE_ACCOUNT';
export type WorkspaceMemberStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
export type WorkspaceInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  invitedBy?: string | null;
  joinedAt: string;
  removedAt?: string | null;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceMemberRole;
  status: WorkspaceInvitationStatus;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string | null;
}

export interface MemberFilterParams {
  role?: WorkspaceMemberRole;
  status?: WorkspaceMemberStatus;
  page?: number;
  limit?: number;
}

export interface InvitationFilterParams {
  status?: WorkspaceInvitationStatus;
  page?: number;
  limit?: number;
}

export interface InviteMemberPayload {
  email: string;
  role: WorkspaceMemberRole;
}

export interface PaginatedWorkspaceMembers {
  items: WorkspaceMember[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedWorkspaceInvitations {
  items: WorkspaceInvitation[];
  total: number;
  page: number;
  limit: number;
}

// ── Organization profile settings (workspace-scoped) ────────
/** One resolved setting value from the shared Settings framework — `source` indicates whether it was explicitly set at this scope or is inherited/defaulted. */
export interface ResolvedSetting {
  key: string;
  value: unknown;
  source: string;
  valueType: string;
}

/** `GET /organization-settings/profile` response — keyed by field name. */
export type OrganizationProfileSettings = Record<string, ResolvedSetting>;

/** `GET /user-preferences/workspace-view` response — keyed by field name (same resolved-setting shape as org settings). */
export type WorkspaceViewPreferences = Record<string, ResolvedSetting>;

export interface UpdateWorkspaceViewPreferencesPayload {
  defaultWorkspaceId?: string;
  dashboardLayout?: Record<string, unknown>;
  /** Free-form per-table display config (density, visible fields, grouping, sort, pinned rows), keyed by a table/view key the frontend chooses (e.g. "search"). */
  tablePreferences?: Record<string, unknown>;
  /** Free-form per-view saved filter state, keyed by a view key. */
  filterPresets?: Record<string, unknown>;
  savedViews?: Record<string, unknown>[];
  changeReason?: string;
}

export interface UpdateOrganizationProfilePayload {
  name?: string;
  legalName?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  changeReason?: string;
}

/** `GET /organization-settings/regional` response — keyed by field name. */
export type OrganizationRegionalSettings = Record<string, ResolvedSetting>;

export interface UpdateOrganizationRegionalPayload {
  timezone?: string;
  locale?: string;
  currency?: string;
  dateFormat?: string;
  numberFormat?: string;
  measurementSystem?: string;
  enabledLanguages?: string[];
  changeReason?: string;
}

/** `GET /organization-settings/operational` response — keyed by field name. */
export type OrganizationOperationalSettings = Record<string, ResolvedSetting>;

export interface UpdateOrganizationOperationalPayload {
  defaultWorkspaceId?: string;
  defaultMarketplace?: string;
  defaultWarehouseId?: string;
  defaultSupplierId?: string;
  aiPreferences?: Record<string, unknown>;
  notificationPreferences?: Record<string, unknown>;
  changeReason?: string;
}

/** `GET /organization-settings/policies` response — keyed by field name. */
export type OrganizationPolicySettings = Record<string, ResolvedSetting>;

export interface UpdateOrganizationPolicyPayload {
  approvalThreshold?: number;
  approverRoles?: string[];
  autoReorderEnabled?: boolean;
  lowStockThresholdPercent?: number;
  autoPublishEnabled?: boolean;
  minMarginPercent?: number;
  mfaRequired?: boolean;
  sessionTimeoutMinutes?: number;
  auditLogRetentionDays?: number;
  fileRetentionDays?: number;
  changeReason?: string;
}

export type OrganizationSettingsCategoryKey = 'profile' | 'regional' | 'operational' | 'policies';

/** Shared by every organization-settings category endpoint's optional scope override (defaults to WORKSPACE). */
export interface OrganizationSettingScopeParams {
  scope?: SettingScope;
  organizationId?: string;
}

// ── Audit log (workspace activity) ──────────────────────────
export type AuditActionCategory = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'SYNC' | 'LOGIN' | 'PERMISSION' | 'CONFIGURATION' | 'OVERRIDE' | 'OTHER';
export type AuditRiskLevel = 'NORMAL' | 'SUSPICIOUS' | 'HIGH_RISK';

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  actorType: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory: AuditActionCategory;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  businessId?: string | null;
  outcome: string;
  reason?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  changedFields?: string[];
  riskLevel: AuditRiskLevel;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: string;
}

export interface AuditLogFilterParams {
  module?: string;
  action?: string;
  actionCategory?: AuditActionCategory;
  actorType?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  businessId?: string;
  outcome?: string;
  riskLevel?: AuditRiskLevel;
  flagged?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AuditExportResult {
  format: 'CSV' | 'JSON';
  count: number;
  content: string;
}

// ── Auth ───────────────────────────────────────────────────
/** Shape returned by login/register/refresh/switch-workspace — a subset of the full `User` profile (see `GET /users/:id` for the rest). */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  workspaceId: string;
  status: UserStatus;
  /** True ATLAS-staff cross-tenant access — distinct from the workspace-scoped `role` above. */
  isPlatformAdmin: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  workspaceName: string;
}

// ── Permissions ────────────────────────────────────────────
export type PermissionEffect = 'ALLOW' | 'DENY';

export interface EffectivePermission {
  key: string;
  effect: PermissionEffect;
  sourceRoleId: string;
}

export interface EffectivePermissionsResponse {
  userId: string;
  workspaceId: string;
  permissions: EffectivePermission[];
  /** True for legacy full-authority roles (OWNER, ADMIN) — bypasses the granular assignment-based `permissions` list for normal module access. Never applies to Platform Administration, which is gated solely by `isPlatformAdmin`. */
  hasFullAccess: boolean;
}

// ── Notifications ──────────────────────────────────────────
export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED' | 'EXPIRED';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface Notification {
  id: string;
  workspaceId: string;
  recipientUserId?: string | null;
  type: NotificationType;
  category?: string | null;
  priority: NotificationPriority;
  title: string;
  message: string;
  sourceModule?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actionLink?: string | null;
  actionRequired: boolean;
  status: NotificationStatus;
  groupId?: string | null;
  readAt?: string | null;
  archivedAt?: string | null;
  dismissedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Global search ──────────────────────────────────────────
export interface GlobalSearchResultItem {
  entityType: string;
  entityId: string;
  module?: string;
  title: string;
  summary?: string | null;
  navigationRef: unknown;
  tags: string[];
  status?: string | null;
  score: number;
  quickActions: Array<{ action: string; label: string; navigationRef: unknown }>;
}

export interface GlobalSearchResponse {
  items: GlobalSearchResultItem[];
  groupedByEntityType: Record<string, GlobalSearchResultItem[]>;
  groupedByModule: Record<string, GlobalSearchResultItem[]>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  facets: Record<string, Array<{ value: string; count: number }>>;
}

export type SearchMode = 'FULL_TEXT' | 'EXACT' | 'PREFIX' | 'PARTIAL';

export interface GlobalSearchFilterParams {
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

/** Entity registry entry from the Search Framework — drives the search page's filter/facet options so entity handling stays metadata-driven rather than hardcoded per module. */
export interface SearchEntityRegistration {
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
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  query?: string | null;
  filters?: Record<string, unknown>;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchPayload {
  name: string;
  query?: string;
  filters?: Record<string, unknown>;
  isShared?: boolean;
}

export interface UpdateSavedSearchPayload {
  name?: string;
  query?: string;
  filters?: Record<string, unknown>;
  isShared?: boolean;
}

export interface RecentSearchEntry {
  query?: string | null;
  lastSearchedAt: string;
}

export interface RecentEntity {
  entityType: string;
  entityId: string;
  title: string;
  lastOpenedAt: string;
}

/** Raw Search Framework query-log rows, reused as-is by `global-search`'s `search-history` endpoint — the only backend-exposed source of search usage / zero-result / failure visibility. */
export interface SearchHistoryEntry {
  id: string;
  query?: string | null;
  filters?: unknown;
  resultCount: number;
  latencyMs: number;
  failed: boolean;
  errorMessage?: string | null;
  createdAt: string;
}

// ── Product Catalog (`product-catalog` module) ──────────────
export type ProductType = 'PHYSICAL' | 'DIGITAL' | 'BUNDLE' | 'SUBSCRIPTION';
export type CatalogStatus = 'DRAFT' | 'READY_FOR_AI' | 'AI_GENERATED' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface ProductSpecification {
  key: string;
  value: string;
  unit?: string;
}

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  purchaseCost?: number;
  landedCost?: number;
  suggestedSellingPrice?: number;
  images?: string[];
  stockQty?: number;
}

export interface CatalogProduct {
  id: string;
  workspaceId: string;
  catalogSku: string;
  skuSequence: number;
  version: number;
  status: CatalogStatus;
  productName: string;
  brand?: string | null;
  categoryId?: string | null;
  productType: ProductType;
  description?: string | null;
  shortDescription?: string | null;
  procurementId?: string | null;
  qualityInspectionId?: string | null;
  supplierId?: string | null;
  countryOfOrigin?: string | null;
  hsCode?: string | null;
  specifications?: ProductSpecification[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  images: string[];
  purchaseCost?: number | null;
  landedCost?: number | null;
  suggestedSellingPrice?: number | null;
  currency?: string | null;
  isDuplicate: boolean;
  duplicateOfId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCatalogProductPayload {
  productName: string;
  productType: ProductType;
  brand?: string;
  categoryId?: string;
  description?: string;
  shortDescription?: string;
  supplierId?: string;
  countryOfOrigin?: string;
  hsCode?: string;
  images?: string[];
  specifications?: ProductSpecification[];
  attributes?: ProductAttribute[];
  purchaseCost?: number;
  landedCost?: number;
  suggestedSellingPrice?: number;
  currency?: string;
}

export type UpdateCatalogProductPayload = Partial<CreateCatalogProductPayload>;

export interface CatalogHistoryEntry {
  id: string;
  catalogId: string;
  fromStatus: CatalogStatus;
  toStatus: CatalogStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface CatalogFilterParams extends PaginationParams {
  status?: CatalogStatus[];
  productType?: ProductType;
  brand?: string;
  supplierId?: string;
}

// ── Suppliers (`suppliers` module) ──────────────────────────
export type SupplierStatus = 'PROSPECT' | 'ACTIVE' | 'PREFERRED' | 'SUSPENDED' | 'REJECTED' | 'ARCHIVED';

export interface SupplierAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type?: 'REGISTERED' | 'WAREHOUSE' | 'BILLING';
}

export interface SupplierContactPerson {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface SupplierCertification {
  name: string;
  issuingBody?: string;
  issuedAt?: string;
  expiresAt?: string;
  certificateNumber?: string;
}

export interface SupplierBusinessRegistration {
  registrationNumber?: string;
  registrationAuthority?: string;
  registeredAt?: string;
  legalName?: string;
  legalForm?: string;
}

export interface SupplierTaxIdentifier {
  type: string;
  value: string;
  country?: string;
}

export interface SupplierPaymentTerms {
  netDays?: number;
  advancePercentage?: number;
  acceptedMethods?: string[];
  currency?: string;
  notes?: string;
}

export interface SupplierShippingTerms {
  incoterms?: string;
  preferredCarriers?: string[];
  avgTransitDays?: number;
  freeShippingThreshold?: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  workspaceId: string;
  name: string;
  legalName?: string | null;
  provider: string;
  providerSupplierId?: string | null;
  status: SupplierStatus;
  tier: string;
  country: string;
  city?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  addresses?: SupplierAddress[] | null;
  contactPersons?: SupplierContactPerson[] | null;
  businessRegistration?: SupplierBusinessRegistration | null;
  taxIdentifiers?: SupplierTaxIdentifier[] | null;
  categories: string[];
  minOrderQuantity?: number | null;
  avgLeadTimeDays?: number | null;
  paymentTerms?: SupplierPaymentTerms | null;
  shippingTerms?: SupplierShippingTerms | null;
  certifications?: SupplierCertification[] | null;
  overallRating?: number | null;
  verificationScore?: number | null;
  verificationStatus?: string | null;
  riskScore?: number | null;
  performanceScore?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateSupplierPayload {
  name: string;
  legalName?: string;
  status?: SupplierStatus;
  country?: string;
  city?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  addresses?: SupplierAddress[];
  contactPersons?: SupplierContactPerson[];
  businessRegistration?: SupplierBusinessRegistration;
  taxIdentifiers?: SupplierTaxIdentifier[];
  categories?: string[];
  minOrderQuantity?: number;
  avgLeadTimeDays?: number;
  paymentTerms?: SupplierPaymentTerms;
  shippingTerms?: SupplierShippingTerms;
  certifications?: SupplierCertification[];
  overallRating?: number;
  tags?: string[];
  notes?: string;
  provider?: string;
  providerSupplierId?: string;
}

export type UpdateSupplierPayload = Partial<CreateSupplierPayload>;

export interface SupplierFilterParams extends PaginationParams {
  status?: SupplierStatus[];
  country?: string;
  category?: string;
  provider?: string;
  tags?: string[];
  minVerificationScore?: number;
  minPerformanceScore?: number;
}

export interface UpdateSupplierStatusPayload {
  status: SupplierStatus;
  reason?: string;
}

export interface SupplierStatusHistoryEntry {
  id: string;
  supplierId: string;
  previousStatus?: string | null;
  newStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Supplier Discovery (`supplier-discovery` module — sessions only; the
// module's embedded `/suppliers` CRUD routes are shadowed at the app level
// by the richer `suppliers` module above and are not used here) ─────────
export type SupplierDiscoverySessionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SupplierDiscoverySession {
  id: string;
  workspaceId: string;
  provider: string;
  keyword: string;
  country: string;
  category?: string | null;
  status: SupplierDiscoverySessionStatus;
  totalDiscovered: number;
  newSuppliers: number;
  duplicatesSkipped: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierDiscoverySessionPayload {
  provider: string;
  keyword: string;
  country?: string;
  category?: string;
}

export interface SupplierDiscoverySessionListResult {
  items: SupplierDiscoverySession[];
  total: number;
  page: number;
  limit: number;
}

export interface SupplierDiscoveryStats {
  totalSessions: number;
  runningSessions: number;
  totalSuppliers: number;
  totalNewSuppliers: number;
  totalDuplicatesSkipped: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
}

// ── Supplier Verification (`supplier-verification` module) ─────────────
export type VerificationStatus = 'PENDING' | 'IN_PROGRESS' | 'VERIFIED' | 'REJECTED' | 'REVIEW_REQUIRED';
export type VerificationCheckStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'MANUAL_OVERRIDE';

export interface VerificationCheckResult {
  id: string;
  verificationId: string;
  checkName: string;
  status: VerificationCheckStatus;
  weight: number;
  score: number;
  message?: string | null;
  details: Record<string, unknown>;
  executedAt?: string | null;
  createdAt: string;
}

export interface SupplierVerification {
  id: string;
  workspaceId: string;
  supplierId: string;
  status: VerificationStatus;
  score?: number | null;
  scoreThreshold: number;
  isLatest: boolean;
  overrideNotes?: string | null;
  overriddenBy?: string | null;
  overriddenAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  checkResults?: VerificationCheckResult[];
}

export interface SupplierVerificationListResult {
  items: SupplierVerification[];
  total: number;
  page: number;
  limit: number;
}

export interface StartVerificationPayload {
  notes?: string;
}

export interface ManualOverridePayload {
  status: VerificationStatus;
  reason: string;
}

// ── RFQ (`rfq` module) ───────────────────────────────────────────────
export type RfqStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RESPONDED' | 'RESPONDED' | 'EXPIRED' | 'CANCELLED' | 'CLOSED';
export type RfqSupplierResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COUNTER_OFFERED';

export interface RfqAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface RfqSupplierResponse {
  id: string;
  rfqId: string;
  supplierId: string;
  status: RfqSupplierResponseStatus;
  sentAt?: string | null;
  respondedAt?: string | null;
  quotedPrice?: number | null;
  quotedLeadTimeDays?: number | null;
  quotedMoq?: number | null;
  supplierNotes?: string | null;
  counterOfferDetails?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rfq {
  id: string;
  workspaceId: string;
  rfqNumber: string;
  title: string;
  description?: string | null;
  productId?: string | null;
  opportunityId?: string | null;
  status: RfqStatus;
  quantity: number;
  moq?: number | null;
  targetPrice?: number | null;
  currency: string;
  requiredDeliveryDate?: string | null;
  expiresAt?: string | null;
  paymentTerms?: string | null;
  shippingTerms?: string | null;
  notes?: string | null;
  attachments?: RfqAttachment[] | null;
  supplierResponses?: RfqSupplierResponse[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateRfqPayload {
  title: string;
  description?: string;
  productId?: string;
  opportunityId?: string;
  supplierIds: string[];
  quantity: number;
  moq?: number;
  targetPrice?: number;
  currency?: string;
  requiredDeliveryDate?: string;
  expiresAt?: string;
  paymentTerms?: string;
  shippingTerms?: string;
  notes?: string;
  attachments?: RfqAttachment[];
}

export type UpdateRfqPayload = Partial<Omit<CreateRfqPayload, 'supplierIds'>>;

export interface RfqFilterParams extends PaginationParams {
  status?: RfqStatus[];
  supplierId?: string;
  productId?: string;
  opportunityId?: string;
}

export interface RfqListResult {
  items: Rfq[];
  total: number;
  page: number;
  limit: number;
}

export interface SubmitRfqResponsePayload {
  status: RfqSupplierResponseStatus;
  quotedPrice?: number;
  quotedLeadTimeDays?: number;
  quotedMoq?: number;
  supplierNotes?: string;
  counterOfferDetails?: Record<string, unknown>;
}

// ── Quotation Comparison (`quotation-comparison` module) ───────────────
export type ComparisonStatus = 'PENDING' | 'COMPLETED' | 'REVISED' | 'ARCHIVED';
export type ComparisonRecommendation = 'STRONGLY_RECOMMENDED' | 'RECOMMENDED' | 'ACCEPTABLE' | 'NOT_RECOMMENDED';

export interface ComparisonWeights {
  unitPrice: number;
  totalCost: number;
  moq: number;
  leadTime: number;
  paymentTerms: number;
  shippingTerms: number;
  certifications: number;
  verificationScore: number;
  riskScore: number;
  performanceScore: number;
}

export interface SupplierScoreBreakdown {
  supplierId: string;
  rfqSupplierId: string;
  quotedUnitPrice: number | null;
  quotedTotalCost: number | null;
  quotedMoq: number | null;
  quotedLeadTimeDays: number | null;
  paymentTerms: string | null;
  shippingTerms: string | null;
  certifications: string[];
  verificationScore: number | null;
  riskScore: number | null;
  performanceScore: number | null;
  unitPriceScore: number;
  totalCostScore: number;
  moqScore: number;
  leadTimeScore: number;
  paymentTermsScore: number;
  shippingTermsScore: number;
  certificationsScore: number;
  verificationScoreNorm: number;
  riskScoreNorm: number;
  performanceScoreNorm: number;
  comparisonScore: number;
  recommendation: ComparisonRecommendation;
  rank: number;
}

export interface QuotationComparison {
  id: string;
  workspaceId: string;
  rfqId: string;
  version: number;
  status: ComparisonStatus;
  weights: ComparisonWeights;
  supplierBreakdowns: SupplierScoreBreakdown[];
  recommendedSupplierId: string | null;
  selectedSupplierId: string | null;
  selectionReason: string | null;
  selectionBy: string | null;
  selectionAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateQuotationComparisonPayload {
  rfqId: string;
  weights?: Partial<ComparisonWeights>;
  notes?: string;
}

export interface SelectSupplierPayload {
  supplierId: string;
  reason?: string;
}

export interface QuotationComparisonFilterParams extends PaginationParams {
  rfqId?: string;
  status?: ComparisonStatus | ComparisonStatus[];
}

export interface QuotationComparisonListResult {
  items: QuotationComparison[];
  total: number;
  page: number;
  limit: number;
}

// ── Procurement (`procurement` module) ──────────────────────────────
export type ProcurementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ORDERED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ProcurementAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface Procurement {
  id: string;
  workspaceId: string;
  procurementNumber: string;
  productId?: string | null;
  supplierId?: string | null;
  rfqId?: string | null;
  quotationComparisonId?: string | null;
  status: ProcurementStatus;
  quantity: number;
  agreedUnitCost: number;
  totalCost: number;
  currency: string;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  expectedDeliveryDate?: string | null;
  procurementOwner?: string | null;
  notes?: string | null;
  attachments?: ProcurementAttachment[] | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  orderedAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateProcurementPayload {
  productId?: string;
  supplierId?: string;
  rfqId?: string;
  quotationComparisonId?: string;
  quantity: number;
  agreedUnitCost: number;
  currency?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  expectedDeliveryDate?: string;
  procurementOwner?: string;
  notes?: string;
  attachments?: ProcurementAttachment[];
}

export type UpdateProcurementPayload = Partial<CreateProcurementPayload>;

export interface ProcurementFilterParams extends PaginationParams {
  status?: ProcurementStatus | ProcurementStatus[];
  productId?: string;
  supplierId?: string;
  rfqId?: string;
  procurementOwner?: string;
  currency?: string;
}

export interface ProcurementListResult {
  items: Procurement[];
  total: number;
  page: number;
  limit: number;
}

export interface ProcurementHistoryEntry {
  id: string;
  procurementId: string;
  fromStatus: ProcurementStatus;
  toStatus: ProcurementStatus;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

// ── Purchase Orders (`purchase-order` module) ───────────────────────
export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'ACKNOWLEDGED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CLOSED'
  | 'CANCELLED';

export interface POAddress {
  companyName?: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface POLineItem {
  productId?: string;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  currency?: string;
  notes?: string;
}

export interface POAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface PurchaseOrder {
  id: string;
  workspaceId: string;
  poNumber: string;
  version: number;
  procurementId?: string | null;
  supplierId?: string | null;
  status: PurchaseOrderStatus;
  lineItems: POLineItem[];
  totalAmount: number;
  currency: string;
  paymentTerms?: string | null;
  shippingTerms?: string | null;
  incoterms?: string | null;
  expectedDispatchDate?: string | null;
  expectedDeliveryDate?: string | null;
  billingAddress?: POAddress | null;
  shippingAddress?: POAddress | null;
  notes?: string | null;
  attachments?: POAttachment[] | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  issuedAt?: string | null;
  acknowledgedAt?: string | null;
  cancelReason?: string | null;
  providerCode?: string | null;
  providerPoRef?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreatePurchaseOrderPayload {
  procurementId?: string;
  supplierId?: string;
  lineItems: POLineItem[];
  currency: string;
  paymentTerms?: string;
  shippingTerms?: string;
  incoterms?: string;
  expectedDispatchDate?: string;
  expectedDeliveryDate?: string;
  billingAddress?: POAddress;
  shippingAddress?: POAddress;
  notes?: string;
  attachments?: POAttachment[];
}

export type UpdatePurchaseOrderPayload = Partial<CreatePurchaseOrderPayload>;

export interface PurchaseOrderFilterParams extends PaginationParams {
  status?: PurchaseOrderStatus | PurchaseOrderStatus[];
  procurementId?: string;
  supplierId?: string;
  currency?: string;
}

export interface PurchaseOrderListResult {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
}

export interface PurchaseOrderHistoryEntry {
  id: string;
  purchaseOrderId: string;
  fromStatus: PurchaseOrderStatus;
  toStatus: PurchaseOrderStatus;
  version: number;
  changedBy: string;
  reason: string | null;
  createdAt: string;
}

// ── Shipments (`shipment-tracking` module) ──────────────────────────
export type ShipmentStatus =
  | 'PENDING'
  | 'READY'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'CUSTOMS_CLEARANCE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELAYED'
  | 'LOST'
  | 'CANCELLED';

export interface ShipmentAddress {
  companyName?: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface ShipmentPackage {
  packageNumber: number;
  weight?: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  description?: string;
  trackingNumber?: string;
}

export interface ShipmentAttachment {
  name: string;
  url: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface Shipment {
  id: string;
  workspaceId: string;
  shipmentNumber: string;
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  status: ShipmentStatus;
  isPartial: boolean;
  carrier?: string | null;
  trackingNumber?: string | null;
  shipmentMethod?: string | null;
  origin?: ShipmentAddress | null;
  destination?: ShipmentAddress | null;
  dispatchDate?: string | null;
  estimatedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  shippingCost?: number | null;
  currency?: string | null;
  totalWeight?: number | null;
  weightUnit?: string | null;
  packages?: ShipmentPackage[] | null;
  notes?: string | null;
  attachments?: ShipmentAttachment[] | null;
  lastTrackedAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateShipmentPayload {
  purchaseOrderId?: string;
  supplierId?: string;
  isPartial?: boolean;
  carrier?: string;
  trackingNumber?: string;
  shipmentMethod?: string;
  origin?: ShipmentAddress;
  destination?: ShipmentAddress;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  shippingCost?: number;
  currency?: string;
  totalWeight?: number;
  weightUnit?: string;
  packages?: ShipmentPackage[];
  notes?: string;
  attachments?: ShipmentAttachment[];
}

export type UpdateShipmentPayload = Partial<CreateShipmentPayload>;

export interface ShipmentFilterParams extends PaginationParams {
  status?: ShipmentStatus | ShipmentStatus[];
  purchaseOrderId?: string;
  supplierId?: string;
  carrier?: string;
  trackingNumber?: string;
}

export interface ShipmentListResult {
  items: Shipment[];
  total: number;
  page: number;
  limit: number;
}

export interface ShipmentTrackingHistoryEntry {
  id: string;
  shipmentId: string;
  fromStatus: ShipmentStatus;
  toStatus: ShipmentStatus;
  location: string | null;
  description: string;
  source: string;
  changedBy: string | null;
  createdAt: string;
}

export interface UpdateTrackingPayload {
  status: ShipmentStatus;
  location?: string;
  description: string;
  estimatedDeliveryDate?: string;
}

// ── Quality Inspections (`quality-inspection` module) ───────────────
export type QualityInspectionStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'CONDITIONAL_APPROVAL' | 'REJECTED' | 'CLOSED';
export type InspectionType = 'PRE_PRODUCTION' | 'DURING_PRODUCTION' | 'PRE_SHIPMENT' | 'CONTAINER_LOADING' | 'RECEIVING' | 'IN_HOUSE' | 'RE_INSPECTION';
export type SamplingMethod = 'AQL_1_0' | 'AQL_1_5' | 'AQL_2_5' | 'AQL_4_0' | 'FULL' | 'RANDOM' | 'CUSTOM';
export type DefectSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'COSMETIC';
export type InspectionRecommendation = 'APPROVE' | 'CONDITIONALLY_APPROVE' | 'REJECT' | 'RE_INSPECT';

export interface InspectedProduct {
  productId: string;
  productName: string;
  sku?: string;
}

export interface DefectDetail {
  description: string;
  severity: DefectSeverity;
  quantity: number;
  location?: string;
  imageUrls?: string[];
}

export interface ChecklistItem {
  id: string;
  description: string;
  passed: boolean;
  notes?: string;
}

export interface InspectionAttachment {
  name: string;
  url: string;
  type: 'image' | 'document';
}

export interface QualityInspection {
  id: string;
  workspaceId: string;
  inspectionNumber: string;
  inspectionSequence: number;
  status: QualityInspectionStatus;
  inspectionType: InspectionType;
  samplingMethod: SamplingMethod;
  shipmentId?: string | null;
  purchaseOrderId?: string | null;
  supplierId?: string | null;
  parentInspectionId?: string | null;
  products: InspectedProduct[];
  inspector?: string | null;
  inspectorName?: string | null;
  scheduledDate?: string | null;
  inspectionDate?: string | null;
  completedAt?: string | null;
  quantityOrdered: number;
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defects: DefectDetail[];
  checklist: ChecklistItem[];
  qualityScore?: number | null;
  recommendation?: InspectionRecommendation | null;
  images: string[];
  attachments: InspectionAttachment[];
  notes?: string | null;
  internalNotes?: string | null;
  conditionsForApproval?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityInspectionPayload {
  shipmentId?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  parentInspectionId?: string;
  inspectionType: InspectionType;
  samplingMethod: SamplingMethod;
  products?: InspectedProduct[];
  inspector?: string;
  inspectorName?: string;
  scheduledDate?: string;
  inspectionDate?: string;
  quantityOrdered: number;
  quantityInspected?: number;
  quantityPassed?: number;
  quantityFailed?: number;
  defects?: DefectDetail[];
  checklist?: ChecklistItem[];
  images?: string[];
  attachments?: InspectionAttachment[];
  notes?: string;
  internalNotes?: string;
}

export type UpdateQualityInspectionPayload = Partial<CreateQualityInspectionPayload>;

export interface QualityInspectionFilterParams extends PaginationParams {
  status?: QualityInspectionStatus[];
  inspectionType?: InspectionType;
  samplingMethod?: SamplingMethod;
  shipmentId?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  inspector?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Quality inspection list responses use the `data/totalPages` shape (unlike most other sourcing modules' `items` shape). */
export type QualityInspectionListResult = PaginatedResult<QualityInspection>;

export interface QualityInspectionStats {
  total: number;
  byStatus: Record<string, number>;
  averageQualityScore: number;
  passRate: number;
  failRate: number;
}

export interface ScheduleInspectionPayload {
  scheduledDate: string;
  inspector?: string;
  inspectorName?: string;
  notes?: string;
}

export interface CompleteInspectionPayload {
  quantityInspected: number;
  quantityPassed: number;
  quantityFailed: number;
  defects?: DefectDetail[];
  checklist?: ChecklistItem[];
  images?: string[];
  attachments?: InspectionAttachment[];
  notes?: string;
  internalNotes?: string;
}

// ── Supplier Analytics (`supplier-analytics` module) ────────────────
export interface SupplierQuotationMetrics {
  rfqSent: number;
  quotationsReceived: number;
  responseRate: number;
  averagePriceCompetitiveness: number;
  averageMoq: number;
  averageLeadTime: number;
  favorablePaymentTermsPercent: number;
}

export interface SupplierProcurementMetrics {
  purchaseOrderCount: number;
  totalPurchaseOrderValue: number;
  fulfillmentRate: number;
  onTimeDispatchRate: number;
  onTimeDeliveryRate: number;
  averageDeliveryDays: number;
}

export interface SupplierQualityMetrics {
  inspectionsCompleted: number;
  qualityScore: number;
  defectRate: number;
  rejectionRate: number;
  inspectionFailureRate: number;
  returnRate: number;
  returnImpactAmount: number;
}

export type SupplierAnalyticsMetricType =
  | 'quotation_response_rate'
  | 'price_competitiveness'
  | 'purchase_order_value'
  | 'fulfillment_rate'
  | 'on_time_dispatch_rate'
  | 'on_time_delivery_rate'
  | 'quality_score'
  | 'defect_rate'
  | 'rejection_rate'
  | 'return_rate'
  | 'average_lead_time'
  | 'average_moq';

export type SupplierAnalyticsDimension = 'supplier' | 'provider' | 'category' | 'product' | 'country' | 'region' | 'currency';

export type SupplierAnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export type SupplierPerformanceCategory = 'preferred' | 'improving' | 'declining' | 'risky' | 'inactive' | 'average' | 'new';

export type SupplierComparisonType = 'previous_period' | 'same_period_last_year' | 'verification_score' | 'risk_score' | 'expected_performance';

export interface SupplierPerformance {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  providerKey?: string;
  category?: string;
  country?: string;
  performanceCategory: SupplierPerformanceCategory;
  quotationMetrics: SupplierQuotationMetrics;
  procurementMetrics: SupplierProcurementMetrics;
  qualityMetrics: SupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  period: SupplierAnalyticsPeriod;
  startDate: string;
  endDate: string;
  currency: string;
}

export interface SupplierAnalyticsFilterParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  period?: SupplierAnalyticsPeriod;
  supplierIds?: string[];
  providerKeys?: string[];
  categories?: string[];
  productIds?: string[];
  countries?: string[];
  regions?: string[];
  currency?: string;
  performanceCategory?: SupplierPerformanceCategory;
  minOverallScore?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierTrendPoint {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  period: SupplierAnalyticsPeriod;
  periodStart: string;
  periodEnd: string;
  metricType: SupplierAnalyticsMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  metadata?: Record<string, unknown>;
}

export interface SupplierBreakdownRow {
  workspaceId: string;
  dimension: SupplierAnalyticsDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: SupplierAnalyticsPeriod;
  startDate: string;
  endDate: string;
  quotationMetrics: SupplierQuotationMetrics;
  procurementMetrics: SupplierProcurementMetrics;
  qualityMetrics: SupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierComparison {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  comparisonType: SupplierComparisonType;
  actualMetrics: {
    quotationMetrics: SupplierQuotationMetrics;
    procurementMetrics: SupplierProcurementMetrics;
    qualityMetrics: SupplierQualityMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    quotationMetrics: SupplierQuotationMetrics;
    procurementMetrics: SupplierProcurementMetrics;
    qualityMetrics: SupplierQualityMetrics;
    overallScore: number;
  };
  variance: {
    responseRatePoints: number;
    priceCompetitivenessPoints: number;
    fulfillmentRatePoints: number;
    onTimeDeliveryRatePoints: number;
    qualityScorePoints: number;
    defectRatePoints: number;
    overallScorePoints: number;
  };
  period: SupplierAnalyticsPeriod;
  startDate: string;
  endDate: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierRanking {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  category?: string;
  overallScore: number;
  rank: number;
  quotationScore: number;
  procurementScore: number;
  qualityScore: number;
  verificationScore?: number;
  riskScore?: number;
  period: SupplierAnalyticsPeriod;
  startDate: string;
  endDate: string;
  metadata?: Record<string, unknown>;
}

/** `suppliers` list responses use `items` rather than `data` (unlike `product-catalog`'s `PaginatedResult`). */
export interface SupplierListResult {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
}

// ── Executive Dashboard (`executive-dashboard` module) ──────
export type ExecutiveMetricCategory = 'revenue' | 'profit' | 'orders' | 'products' | 'suppliers' | 'inventory' | 'procurement' | 'warehouse' | 'marketplace' | 'ai_operations';
export type TrendDirection = 'up' | 'down' | 'stable';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ExecutiveKpi {
  id: string;
  workspaceId: string;
  category: ExecutiveMetricCategory;
  metricKey: string;
  name: string;
  currentValue: number;
  targetValue?: number;
  previousValue?: number;
  variance?: number;
  variancePercent?: number;
  trendDirection: TrendDirection;
  unit?: string;
  period: string;
  updatedAt: string;
}

export interface ExecutiveSummary {
  category: ExecutiveMetricCategory;
  metrics: Record<string, number>;
  trends: Record<string, TrendDirection>;
  alerts: number;
  lastUpdated: string;
}

export interface ExecutiveAlert {
  id: string;
  workspaceId: string;
  severity: AlertSeverity;
  category: ExecutiveMetricCategory;
  title: string;
  description: string;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  resolvedAt?: string;
}

export interface ExecutiveInsight {
  category: ExecutiveMetricCategory;
  insightType: string;
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceComparison {
  marketplaceId: string;
  marketplaceName: string;
  provider: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  fulfillmentRate: number;
  returnRate: number;
  revenueGrowth: number;
}

export interface AiOperationsSummary {
  totalRequests: number;
  successRate: number;
  totalCost: number;
  averageLatency: number;
  topModels: Array<{ modelKey: string; requests: number; cost: number }>;
  costSavings: number;
  failureRate: number;
  recommendationCount: number;
}

export interface ExecutiveOverview {
  kpis: ExecutiveKpi[];
  summaries: ExecutiveSummary[];
  alerts: ExecutiveAlert[];
  insights: ExecutiveInsight[];
  marketplaceComparisons: MarketplaceComparison[];
  aiOperations: AiOperationsSummary;
  generatedAt: string;
}

export interface ExecutiveOverviewFilters {
  workspaceId: string;
  startDate: string;
  endDate: string;
  marketplaceIds?: string[];
  accountIds?: string[];
  warehouseIds?: string[];
  categoryIds?: string[];
  currency?: string;
  comparisonPeriod?: { start: string; end: string };
}

// ── Task management ────────────────────────────────────────
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskSource = 'MANUAL' | 'SYSTEM_GENERATED' | 'WORKFLOW_GENERATED' | 'APPROVAL_GENERATED' | 'AI_GENERATED';
export type TaskAssigneeType = 'USER' | 'ROLE' | 'TEAM' | 'WORKSPACE';

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  dueAt?: string | null;
  progressPercent: number;
}

export interface TaskDashboard {
  myTasks: TaskSummary[];
  teamTasks: TaskSummary[];
  overdueTasks: TaskSummary[];
  upcomingTasks: TaskSummary[];
}

export interface TaskRecurrenceConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  endDate?: string;
}

export interface TaskReminderConfig {
  beforeDueHours: number[];
}

export interface TaskEscalationConfig {
  afterOverdueHours: number;
  escalateToRoleKeys?: string[];
  escalateToUserIds?: string[];
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  source: TaskSource;
  taskType?: string | null;
  category?: string | null;
  labels: string[];
  status: TaskStatus;
  priority: TaskPriority;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  assigneeType?: TaskAssigneeType | null;
  assigneeRef?: string | null;
  createdBy?: string | null;
  parentTaskId?: string | null;
  dependsOnTaskIds: string[];
  isMilestone: boolean;
  dueAt?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  progressPercent: number;
  effortEstimateHours?: number | null;
  timeSpentMinutes: number;
  recurrence?: TaskRecurrenceConfig | null;
  recurrenceParentTaskId?: string | null;
  reminderConfig?: TaskReminderConfig | null;
  escalation?: TaskEscalationConfig | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface TaskFilterParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  module?: string;
  entityType?: string;
  entityId?: string;
  taskType?: string;
  category?: string;
  label?: string;
  parentTaskId?: string;
  assigneeType?: TaskAssigneeType;
  assigneeRef?: string;
  search?: string;
  myTasks?: boolean;
  overdue?: boolean;
  upcoming?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  source?: TaskSource;
  taskType?: string;
  category?: string;
  labels?: string[];
  priority?: TaskPriority;
  module?: string;
  entityType?: string;
  entityId?: string;
  assigneeType?: TaskAssigneeType;
  assigneeRef?: string;
  parentTaskId?: string;
  dependsOnTaskIds?: string[];
  isMilestone?: boolean;
  dueAt?: string;
  effortEstimateHours?: number;
  recurrence?: TaskRecurrenceConfig;
  reminderConfig?: TaskReminderConfig;
  escalation?: TaskEscalationConfig;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateTaskPayload = Partial<Pick<CreateTaskPayload, 'title' | 'description' | 'taskType' | 'category' | 'labels' | 'priority' | 'dependsOnTaskIds' | 'isMilestone' | 'dueAt' | 'effortEstimateHours' | 'recurrence' | 'reminderConfig' | 'escalation' | 'metadata'>>;

export interface AssignTaskPayload {
  assigneeType: TaskAssigneeType;
  assigneeRef: string;
}

export interface UpdateTaskProgressPayload {
  progressPercent?: number;
  timeSpentMinutesDelta?: number;
}

export interface TaskActionReasonPayload {
  reason?: string;
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  text: string;
  isDone: boolean;
  order: number;
  completedAt?: string | null;
  completedBy?: string | null;
}

export interface CreateTaskChecklistItemPayload {
  text: string;
  order?: number;
}

export interface UpdateTaskChecklistItemPayload {
  text?: string;
  isDone?: boolean;
  order?: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId?: string | null;
  comment: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileId: string;
  addedBy?: string | null;
  createdAt: string;
}

export interface TaskWatcher {
  id: string;
  taskId: string;
  userId: string;
  createdAt: string;
}

// ── Approval workflow (pending approvals) ─────────────────────
export type ApprovalRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'CANCELLED' | 'RECALLED' | 'EXPIRED';
export type ApprovalStepStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SKIPPED' | 'ESCALATED' | 'EXPIRED';
export type ApprovalAssignmentStatus = 'PENDING' | 'ACTED' | 'DELEGATED' | 'REASSIGNED' | 'EXPIRED';
export type ApproverType = 'USER' | 'ROLE' | 'TEAM' | 'BUSINESS_UNIT';
export type ApprovalStrategy = 'QUORUM' | 'ANY_ONE' | 'MAJORITY' | 'UNANIMOUS';
export type ApprovalDecisionAction = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEFER' | 'DELEGATE' | 'REASSIGN' | 'CANCEL' | 'RECALL' | 'OVERRIDE';

export interface ApprovalRequestSummary {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  title: string;
  amount?: number | null;
  riskLevel?: string | null;
  status: ApprovalRequestStatus;
  slaDueAt?: string | null;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  definitionId: string;
  definitionVersion: number;
  module: string;
  entityType: string;
  entityId: string;
  requestedBy?: string | null;
  title: string;
  amount?: number | null;
  riskLevel?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  currentStepIndex: number;
  status: ApprovalRequestStatus;
  metadata?: unknown;
  slaDueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface ApprovalRequestListParams {
  module?: string;
  entityType?: string;
  entityId?: string;
  definitionId?: string;
  status?: ApprovalRequestStatus;
  requestedBy?: string;
  assignedToMe?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ApprovalAssignment {
  id: string;
  stepInstanceId: string;
  approverType: ApproverType;
  approverRef: string;
  status: ApprovalAssignmentStatus;
  delegatedToUserId?: string | null;
}

export interface ApprovalStepInstance {
  id: string;
  requestId: string;
  stepIndex: number;
  name: string;
  status: ApprovalStepStatus;
  strategy: string;
  requiredApprovals: number;
  receivedApprovals: number;
  dueAt?: string | null;
  escalatedAt?: string | null;
  assignments?: ApprovalAssignment[];
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  stepInstanceId?: string | null;
  decidedBy: string;
  action: ApprovalDecisionAction;
  comment?: string | null;
  delegatedToUserId?: string | null;
  reassignedToUserId?: string | null;
  evidence?: unknown;
  sourceReference?: unknown;
  createdAt: string;
}

export interface DecideApprovalPayload {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'DEFER';
  comment?: string;
  evidence?: Record<string, unknown>;
  sourceReference?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface DelegateApprovalPayload {
  delegateToUserId: string;
  comment?: string;
}

export interface ReassignApprovalPayload {
  reassignToUserId: string;
  comment?: string;
}

export interface OverrideApprovalPayload {
  comment: string;
  evidence?: Record<string, unknown>;
}

export interface ApprovalActionReasonPayload {
  reason?: string;
}

// ── Activity feed (recent activity timeline) ──────────────────
export type ActivityActorType = 'USER' | 'SYSTEM' | 'SCHEDULER' | 'WEBHOOK' | 'PROVIDER' | 'AI_AGENT' | 'PLATFORM_ADMIN' | 'ORGANIZATION_ADMIN' | 'SERVICE_ACCOUNT';
export type ActivityOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'PENDING';
export type ActivityStatus = 'UNREAD' | 'READ' | 'ARCHIVED' | 'DISMISSED';

export interface ActivityEntry {
  id: string;
  workspaceId?: string;
  actorType?: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  sourceModule: string;
  entityType?: string | null;
  entityId?: string | null;
  outcome?: ActivityOutcome;
  title: string;
  description?: string | null;
  timelineId?: string | null;
  status?: ActivityStatus;
  pinned?: boolean;
  readAt?: string | null;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityFilterParams {
  status?: ActivityStatus;
  actorType?: ActivityActorType;
  actorId?: string;
  sourceModule?: string;
  action?: string;
  outcome?: ActivityOutcome;
  entityType?: string;
  entityId?: string;
  pinned?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── File management (`file-management` module) ────────────────
export type FileCategory = 'DOCUMENT' | 'IMAGE' | 'SPREADSHEET' | 'PDF' | 'EXPORT' | 'REPORT' | 'GENERATED_ASSET' | 'OTHER';
export type FileStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type FileAccessPurpose = 'DOWNLOAD' | 'PREVIEW';

export interface FileRecord {
  id: string;
  workspaceId: string;
  name: string;
  originalName: string;
  extension?: string | null;
  mimeType: string;
  category: FileCategory;
  sizeBytes: number;
  checksum: string;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  folderId?: string | null;
  tags: string[];
  version: number;
  status: FileStatus;
  ownerId?: string | null;
  downloadCount: number;
  lastAccessedAt?: string | null;
  retentionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface FileFilterParams {
  module?: string;
  entityType?: string;
  entityId?: string;
  folderId?: string;
  category?: FileCategory;
  status?: FileStatus;
  ownerId?: string;
  tags?: string[];
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UploadFilePayload {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  checksum?: string;
  category?: FileCategory;
  module?: string;
  entityType?: string;
  entityId?: string;
  folderId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  sizeBytes: number;
  checksum: string;
  changeReason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface FileFolder {
  id: string;
  workspaceId: string;
  name: string;
  parentFolderId?: string | null;
  module?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileAccessToken {
  id: string;
  fileId: string;
  token: string;
  purpose: FileAccessPurpose;
  expiresAt: string;
  maxUses?: number | null;
  createdAt: string;
}

export interface StorageQuota {
  workspaceId: string;
  quotaBytes: number;
  usedBytes: number;
  availableBytes: number;
}

// ── Document management (`document-management` module) ─────────
export type DocumentType = 'SUPPLIER' | 'PROCUREMENT' | 'PURCHASE_ORDER' | 'SHIPMENT' | 'QUALITY' | 'PRODUCT' | 'MARKETPLACE' | 'WAREHOUSE' | 'FINANCE' | 'SAAS' | 'OTHER';
export type DocumentSourceType = 'UPLOADED' | 'GENERATED' | 'TEMPLATE';
export type DocumentStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'ARCHIVED';

export interface AtlasDocument {
  id: string;
  workspaceId: string;
  documentType: DocumentType;
  title: string;
  documentNumber?: string | null;
  ownerId?: string | null;
  sourceModule?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  source: DocumentSourceType;
  templateId?: string | null;
  fileId: string;
  status: DocumentStatus;
  version: number;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  revisionNotes?: string | null;
  expiresAt?: string | null;
  renewalDocumentId?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface DocumentFilterParams {
  documentType?: DocumentType;
  status?: DocumentStatus;
  sourceModule?: string;
  entityType?: string;
  entityId?: string;
  ownerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateDocumentPayload {
  documentType: DocumentType;
  title: string;
  documentNumber?: string;
  sourceModule?: string;
  entityType?: string;
  entityId?: string;
  source?: DocumentSourceType;
  templateId?: string;
  fileName: string;
  mimeType: string;
  contentBase64: string;
  expiresAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateDocumentPayload {
  documentType?: DocumentType;
  title?: string;
  documentNumber?: string;
  expiresAt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DocumentApprovalHistoryEntry {
  id: string;
  documentId: string;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  authorId?: string | null;
  comment: string;
  createdAt: string;
}

export interface DocumentEntityLink {
  id: string;
  documentId: string;
  entityType: string;
  entityId: string;
  linkedBy?: string | null;
  createdAt: string;
}

// ── Notes & Comments (`notes-comments` module) — reusable entity collaboration threads ──
export type NoteType = 'NOTE' | 'COMMENT';
export type NoteVisibility = 'PRIVATE' | 'TEAM' | 'WORKSPACE' | 'ENTITY_PARTICIPANTS';
export type NoteStatus = 'ACTIVE' | 'ARCHIVED';

export interface Note {
  id: string;
  workspaceId: string;
  noteType: NoteType;
  module?: string | null;
  entityType: string;
  entityId: string;
  parentId?: string | null;
  authorId: string;
  content: string;
  visibility: NoteVisibility;
  visibilityRoleKey?: string | null;
  isPinned: boolean;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  isEdited: boolean;
  editedAt?: string | null;
  mentionedUserIds: string[];
  mentionedRoleKeys: string[];
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface NoteFilterParams {
  module?: string;
  entityType?: string;
  entityId?: string;
  noteType?: NoteType;
  status?: NoteStatus;
  authorId?: string;
  parentId?: string;
  topLevelOnly?: boolean;
  isPinned?: boolean;
  isResolved?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateNotePayload {
  noteType?: NoteType;
  module?: string;
  entityType: string;
  entityId: string;
  parentId?: string;
  content: string;
  visibility?: NoteVisibility;
  visibilityRoleKey?: string;
  mentionedUserIds?: string[];
  mentionedRoleKeys?: string[];
}

export interface UpdateNotePayload {
  content?: string;
  visibility?: NoteVisibility;
  visibilityRoleKey?: string;
  mentionedUserIds?: string[];
  mentionedRoleKeys?: string[];
}

export interface NoteEditHistoryEntry {
  id: string;
  noteId: string;
  previousContent: string;
  editedBy?: string | null;
  createdAt: string;
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileId: string;
  addedBy?: string | null;
  createdAt: string;
}

// ── Tags Management (`tags-management` module) ──────────────────
export type TagScope = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE' | 'MODULE';
export type TagManagedBy = 'SYSTEM' | 'USER';
export type TagStatus = 'ACTIVE' | 'ARCHIVED';

export interface Tag {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope: TagScope;
  module?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  groupId?: string | null;
  category?: string | null;
  icon?: string | null;
  color?: string | null;
  displayOrder: number;
  managedBy: TagManagedBy;
  isSystem: boolean;
  status: TagStatus;
  usageCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface TagFilterParams {
  scope?: TagScope;
  module?: string;
  groupId?: string;
  category?: string;
  status?: TagStatus;
  managedBy?: TagManagedBy;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateTagPayload {
  name: string;
  scope?: TagScope;
  organizationId?: string;
  module?: string;
  description?: string;
  groupId?: string;
  category?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  managedBy?: TagManagedBy;
}

export interface UpdateTagPayload {
  name?: string;
  description?: string;
  groupId?: string | null;
  category?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface TagGroup {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagGroupPayload {
  name: string;
  description?: string;
  displayOrder?: number;
}

export type UpdateTagGroupPayload = Partial<CreateTagGroupPayload>;

export interface TagAssignment {
  id: string;
  tagId: string;
  entityType: string;
  entityId: string;
  assignedBy?: string | null;
  createdAt: string;
}

export interface AssignTagPayload {
  module?: string;
  entityType: string;
  entityId: string;
}

export interface BulkAssignTagsPayload {
  tagIds: string[];
  module?: string;
  entityType: string;
  entityId: string;
}

export interface BulkRemoveTagsPayload {
  tagIds: string[];
  entityType: string;
  entityId: string;
}

export interface TagHistoryEntry {
  id: string;
  tagId: string;
  fromStatus?: TagStatus | null;
  toStatus: TagStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface TagSavedView {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagSavedViewPayload {
  name: string;
  filters: Record<string, unknown>;
  isShared?: boolean;
}

// ── Operations Health (`operations-health` module) ──────────────
export type OperationsHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type OperationsHealthIncidentStatus = 'OPEN' | 'RESOLVED';
export type OperationsHealthModuleKey =
  | 'NOTIFICATIONS'
  | 'FILE_MANAGEMENT'
  | 'DOCUMENT_MANAGEMENT'
  | 'APPROVAL_WORKFLOW'
  | 'TASK_MANAGEMENT'
  | 'SEARCH_FRAMEWORK'
  | 'BUSINESS_RULES_ENGINE'
  | 'SETTINGS';
export type OperationsHealthIssueTag = 'QUEUE_PAUSED' | 'QUEUE_BACKLOG' | 'HIGH_FAILURE_RATE' | 'STUCK' | 'DELAYED' | 'REPEATEDLY_FAILING' | 'STALE_CHECK';

export interface OperationsHealthIssue {
  tag: OperationsHealthIssueTag;
  message: string;
}

export interface OperationsHealthSnapshot {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount: number;
  consecutiveDegradedChecks: number;
  consecutiveHealthyChecks: number;
  issues: OperationsHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt: string;
  lastHealthyAt?: string | null;
  lastDegradedAt?: string | null;
  lastUnhealthyAt?: string | null;
}

export interface OperationsWorkspaceHealthSummary {
  workspaceId: string;
  overallStatus: OperationsHealthStatus;
  modules: OperationsHealthSnapshot[];
}

export interface OperationsHealthIncident {
  id: string;
  workspaceId: string;
  module: string;
  severity: OperationsHealthStatus;
  status: OperationsHealthIncidentStatus;
  triggerSummary: string;
  issues: OperationsHealthIssue[];
  openedAt: string;
  resolvedAt?: string | null;
  durationMs?: number | null;
}

export interface IncidentFilterParams {
  module?: string;
  status?: OperationsHealthIncidentStatus;
  page?: number;
  limit?: number;
}

export interface OperationsHealthCheckLog {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  previousStatus?: OperationsHealthStatus | null;
  trigger: 'MANUAL' | 'SCHEDULED';
  queueBacklog: number;
  queueFailedCount: number;
  auditFailureCount: number;
  issues: OperationsHealthIssue[];
  safeSummary?: string | null;
  checkedAt: string;
}

export interface CheckLogFilterParams {
  module?: string;
  page?: number;
  limit?: number;
}

// ── Settings Framework (`settings` module) — core definitions/values/precedence ──
export type SettingValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ENUM' | 'JSON' | 'SECRET_REF' | 'LIST';
export type SettingScope = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE' | 'MODULE' | 'USER';
export type SettingDefinitionStatus = 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';
export type SettingValueStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';

/** Precedence order used by resolution — later entries win over earlier ones. */
export const SETTING_SCOPE_PRECEDENCE: SettingScope[] = ['GLOBAL', 'ORGANIZATION', 'WORKSPACE', 'MODULE', 'USER'];

export interface SettingDefinition {
  id: string;
  key: string;
  category: string;
  label: string;
  description?: string | null;
  valueType: SettingValueType;
  defaultValue?: unknown;
  enumOptions: string[];
  allowedScopes: SettingScope[];
  validationRules?: unknown;
  dependencies?: unknown;
  module?: string | null;
  isSecretRef: boolean;
  visibilityCondition?: unknown;
  status: SettingDefinitionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SettingDefinitionFilterParams {
  category?: string;
  module?: string;
  status?: SettingDefinitionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateSettingDefinitionPayload {
  key: string;
  category: string;
  label: string;
  description?: string;
  valueType: SettingValueType;
  defaultValue?: unknown;
  enumOptions?: string[];
  allowedScopes: SettingScope[];
  validationRules?: Record<string, unknown>;
  dependencies?: Record<string, unknown>;
  module?: string;
  isSecretRef?: boolean;
  visibilityCondition?: Record<string, unknown>;
}

export type UpdateSettingDefinitionPayload = Partial<Omit<CreateSettingDefinitionPayload, 'key'>>;

export interface SettingValue {
  id: string;
  definitionKey: string;
  scope: SettingScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  moduleKey?: string | null;
  userId?: string | null;
  value: unknown;
  status: SettingValueStatus;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettingValueFilterParams {
  definitionKey?: string;
  scope?: SettingScope;
  moduleKey?: string;
  status?: SettingValueStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateSettingValuePayload {
  definitionKey: string;
  scope: SettingScope;
  moduleKey?: string;
  organizationId?: string;
  value: unknown;
  effectiveFrom?: string;
  effectiveTo?: string;
  changeReason?: string;
}

export interface UpdateSettingValuePayload {
  value?: unknown;
  effectiveFrom?: string;
  effectiveTo?: string;
  changeReason?: string;
}

export interface SettingValueHistoryEntry {
  id: string;
  settingValueId: string;
  definitionKey: string;
  fromValue?: unknown;
  toValue: unknown;
  fromStatus?: SettingValueStatus | null;
  toStatus: SettingValueStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface RollbackSettingValuePayload {
  historyId: string;
  changeReason?: string;
}

/** A resolved setting's `source` shows which precedence tier actually supplied the effective value (or `'DEFAULT'` when none did) — the basis for "inherited vs overridden" display. */
export interface ResolvedSettingFull {
  key: string;
  value: unknown;
  source: SettingScope | 'DEFAULT';
  valueType: SettingValueType;
}

// ── User Preferences (`user-preferences` module) — remaining categories ──
/** `GET /user-preferences/display` response — keyed by field name (locale, timezone, dateFormat, numberFormat, currency, measurementSystem, preferredLanguages). */
export type DisplayPreferences = Record<string, ResolvedSetting>;
/** `GET /user-preferences/notifications` response. */
export type NotificationPreferencesSettings = Record<string, ResolvedSetting>;
/** `GET /user-preferences/defaults` response. */
export type DefaultsPreferences = Record<string, ResolvedSetting>;
/** `GET /user-preferences/appearance` response. */
export type AppearancePreferences = Record<string, ResolvedSetting>;
/** `GET /user-preferences/ai` response. */
export type AiPreferencesSettings = Record<string, ResolvedSetting>;

export interface UpdateDisplayPreferencesPayload {
  language?: string;
  timezone?: string;
  dateFormat?: string;
  numberFormat?: string;
  currency?: string;
  measurementSystem?: string;
  preferredLanguages?: string[];
  changeReason?: string;
}

export type NotificationPriorityThreshold = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UpdateNotificationPreferencesPayload {
  channels?: Record<string, boolean>;
  categories?: Record<string, boolean>;
  priorityThreshold?: NotificationPriorityThreshold;
  quietHours?: { enabled: boolean; start: string; end: string; timezone?: string };
  changeReason?: string;
}

export interface UpdateDefaultsPreferencesPayload {
  marketplace?: string;
  warehouseId?: string;
  reportFormat?: 'PDF' | 'CSV' | 'XLSX';
  analyticsDateRange?: string;
  changeReason?: string;
}

export type AppearanceThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
export type AppearanceDensity = 'COMFORTABLE' | 'COMPACT' | 'SPACIOUS';

export interface UpdateAppearancePreferencesPayload {
  theme?: AppearanceThemeMode;
  density?: AppearanceDensity;
  accessibility?: Record<string, unknown>;
  navigation?: Record<string, unknown>;
  changeReason?: string;
}

export interface UpdateAiPreferencesPayload {
  defaultProvider?: string;
  defaultModel?: string;
  responseStyle?: 'CONCISE' | 'DETAILED' | 'TECHNICAL';
  approvalThreshold?: number;
  changeReason?: string;
}

export type UserPreferencesCategoryKey = 'display' | 'notifications' | 'workspace-view' | 'defaults' | 'appearance' | 'ai';

// ── Business Rules Engine (`business-rules-engine` module) ──────
export type RuleScope = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE';
export type RuleStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';
export type RuleTriggerType = 'API' | 'EVENT' | 'SCHEDULE' | 'WORKFLOW';
export type RuleLogicOperator = 'AND' | 'OR';
export type RuleConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IN'
  | 'NOT_IN'
  | 'BETWEEN'
  | 'EXISTS'
  | 'NOT_EXISTS';
export type RuleActionType = 'NOTIFY' | 'CREATE_TASK' | 'REQUIRE_APPROVAL' | 'UPDATE_STATUS' | 'BLOCK_ACTION' | 'ROUTE_WORKFLOW' | 'EMIT_EVENT';
export type RuleExecutionStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'BLOCKED';

export interface RuleCondition {
  field: string;
  operator: RuleConditionOperator;
  value?: unknown;
}

export interface RuleConditionGroup {
  logic: RuleLogicOperator;
  conditions?: RuleCondition[];
  groups?: RuleConditionGroup[];
}

export interface RuleAction {
  type: RuleActionType | string;
  config: Record<string, unknown>;
}

export interface Rule {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope: RuleScope;
  module: string;
  key: string;
  name: string;
  description?: string | null;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  priority: number;
  executionOrder: number;
  stopOnMatch: boolean;
  isSystem: boolean;
  scheduleIntervalMinutes?: number | null;
  nextRunAt?: string | null;
  version: number;
  status: RuleStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleFilterParams {
  module?: string;
  scope?: RuleScope;
  status?: RuleStatus;
  triggerType?: RuleTriggerType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateRulePayload {
  module: string;
  key: string;
  name: string;
  description?: string;
  scope?: RuleScope;
  organizationId?: string;
  triggerType: RuleTriggerType;
  triggerRef?: string;
  conditions: RuleConditionGroup;
  actions: RuleAction[];
  priority?: number;
  executionOrder?: number;
  stopOnMatch?: boolean;
  scheduleIntervalMinutes?: number;
}

export interface UpdateRulePayload {
  name?: string;
  description?: string;
  triggerRef?: string;
  conditions?: RuleConditionGroup;
  actions?: RuleAction[];
  priority?: number;
  executionOrder?: number;
  stopOnMatch?: boolean;
  scheduleIntervalMinutes?: number;
  changeReason: string;
}

export interface RuleHistoryEntry {
  id: string;
  ruleId: string;
  fromStatus?: RuleStatus | null;
  toStatus: RuleStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface RuleValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleVersion: number;
  module: string;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: RuleExecutionStatus;
  matched: boolean;
  input: unknown;
  actionsExecuted?: unknown;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  durationMs?: number | null;
  createdAt: string;
}

export interface RuleExecutionFilterParams {
  ruleId?: string;
  module?: string;
  status?: RuleExecutionStatus;
  entityType?: string;
  entityId?: string;
  page?: number;
  limit?: number;
}

export interface SimulateRulePayload {
  input: Record<string, unknown>;
}

export interface RuleSimulationResult {
  matched: boolean;
  matchedConditions: unknown;
  wouldExecuteActions: RuleAction[];
  validation: RuleValidationIssue[];
}

export interface RollbackRulePayload {
  historyId: string;
  changeReason: string;
}

// ── Feature Flags (`feature-flags` module) ────────────────────
export type FeatureFlagType = 'BOOLEAN' | 'PERCENTAGE' | 'ALLOWLIST' | 'DENYLIST' | 'RULE_BASED';
export type FeatureFlagScopeType = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE' | 'PLAN' | 'USER' | 'ENVIRONMENT';
export type FeatureFlagDefinitionStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type FeatureFlagOverrideStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';

export interface FeatureFlagTargetingRules {
  allowlist?: string[];
  denylist?: string[];
  planKeys?: string[];
  minTierRank?: number;
  roles?: string[];
  countries?: string[];
  regions?: string[];
  marketplaces?: string[];
  providers?: string[];
  environments?: string[];
}

export interface FeatureFlagDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FeatureFlagType;
  status: FeatureFlagDefinitionStatus;
  defaultEnabled: boolean;
  rolloutPercentage: number | null;
  startDate: string | null;
  endDate: string | null;
  dependencies: string[];
  mutuallyExclusiveWith: string[];
  priority: number;
  killSwitchEnabled: boolean;
  killSwitchReason: string | null;
  owner: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagDefinitionFilterParams {
  type?: FeatureFlagType;
  status?: FeatureFlagDefinitionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateFeatureFlagDefinitionPayload {
  key: string;
  name: string;
  description?: string;
  type: FeatureFlagType;
  defaultEnabled?: boolean;
  rolloutPercentage?: number;
  startDate?: string;
  endDate?: string;
  dependencies?: string[];
  mutuallyExclusiveWith?: string[];
  priority?: number;
  owner?: string;
}

export type UpdateFeatureFlagDefinitionPayload = Partial<Omit<CreateFeatureFlagDefinitionPayload, 'key' | 'type'>>;

export interface FeatureFlagOverride {
  id: string;
  flagKey: string;
  scope: FeatureFlagScopeType;
  scopeKey: string;
  workspaceId: string | null;
  organizationId: string | null;
  status: FeatureFlagOverrideStatus;
  enabled: boolean;
  rolloutPercentage: number | null;
  rules: FeatureFlagTargetingRules | null;
  startDate: string | null;
  endDate: string | null;
  version: number;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagOverrideFilterParams {
  scope?: FeatureFlagScopeType;
  status?: FeatureFlagOverrideStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateFeatureFlagOverridePayload {
  scope: FeatureFlagScopeType;
  organizationId?: string;
  planKey?: string;
  environment?: string;
  targetUserId?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  rules?: FeatureFlagTargetingRules;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface UpdateFeatureFlagOverridePayload {
  enabled?: boolean;
  rolloutPercentage?: number;
  rules?: FeatureFlagTargetingRules;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

export interface FeatureFlagHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  flagKey: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface FeatureFlagEvaluationResult {
  key: string;
  enabled: boolean;
  source: string;
  reason?: string;
}

// ── Localization (`localization` module) ────────────────────────
export type LocaleDirection = 'LTR' | 'RTL';
export type MeasurementSystem = 'METRIC' | 'IMPERIAL';
export type LocaleStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';

export interface LocaleNumberFormat {
  decimalSeparator: string;
  thousandsSeparator: string;
  decimalDigits?: number;
}

export interface Locale {
  id: string;
  code: string;
  language: string;
  country?: string | null;
  script?: string | null;
  nativeName: string;
  displayName: string;
  direction: LocaleDirection;
  dateFormat: string;
  timeFormat: string;
  numberFormat: LocaleNumberFormat;
  currencyCode: string;
  timezone: string;
  measurementSystem: MeasurementSystem;
  fallbackLocaleCode?: string | null;
  status: LocaleStatus;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocaleFilterParams {
  search?: string;
  status?: LocaleStatus;
  direction?: LocaleDirection;
  language?: string;
  country?: string;
  script?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateLocalePayload {
  code: string;
  language: string;
  country?: string;
  script?: string;
  nativeName: string;
  displayName: string;
  direction?: LocaleDirection;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: LocaleNumberFormat;
  currencyCode?: string;
  timezone?: string;
  measurementSystem?: MeasurementSystem;
  fallbackLocaleCode?: string;
}

export interface UpdateLocalePayload {
  nativeName?: string;
  displayName?: string;
  script?: string;
  direction?: LocaleDirection;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: LocaleNumberFormat;
  currencyCode?: string;
  timezone?: string;
  measurementSystem?: MeasurementSystem;
  fallbackLocaleCode?: string;
  isActive?: boolean;
  changeReason?: string;
}

export interface LocaleHistoryEntry {
  id: string;
  localeId: string;
  version: number;
  status: LocaleStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface LocaleAvailability {
  id: string;
  localeCode: string;
  workspaceId?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  isPreferred: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SetLocaleAvailabilityPayload {
  localeCode: string;
  workspaceId?: string;
  countryCode?: string;
  marketplaceKey?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
  isPreferred?: boolean;
}

export interface TranslationCompleteness {
  namespaceKey: string;
  localeCode: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  completenessPercent: number;
}

export interface TranslationNamespace {
  id: string;
  key: string;
  module?: string | null;
  description?: string | null;
}

export interface EffectiveLocale {
  localeCode: string;
  source: string;
}

export interface LocalizationEffectiveSettings {
  localeCode: string;
  localeSource: string;
  timezone: string;
  timezoneSource: string;
  currencyCode: string;
  currencySource: string;
  dateFormat: string;
  dateFormatSource: string;
  numberFormat: string;
  numberFormatSource: string;
  measurementSystem: MeasurementSystem;
  measurementSystemSource: string;
}

export type TranslationStatus = 'DRAFT' | 'PUBLISHED';
export type TranslationIssueType = 'MISSING' | 'OUTDATED' | 'CONFLICTING';

export interface CreateNamespacePayload {
  key: string;
  module?: string;
  description?: string;
}

export interface TranslationKey {
  id: string;
  namespaceId: string;
  key: string;
  description?: string | null;
  defaultValue?: string | null;
}

export interface CreateTranslationKeyPayload {
  key: string;
  description?: string;
  defaultValue?: string;
}

export interface Translation {
  id: string;
  keyId: string;
  localeCode: string;
  value: string;
  version: number;
  status: TranslationStatus;
  updatedAt: string;
}

export interface SetTranslationPayload {
  value: string;
}

export interface ImportTranslationsPayload {
  translations: Record<string, string>;
}

export interface TranslationHistoryEntry {
  id: string;
  translationId: string;
  previousValue?: string | null;
  newValue: string;
  version: number;
  changedBy?: string | null;
  createdAt: string;
}

export interface MissingKeysResult {
  namespaceKey: string;
  localeCode: string;
  missingKeys: string[];
}

export interface TranslationIssue {
  type: TranslationIssueType;
  namespaceKey: string;
  key: string;
  localeCode: string;
  message: string;
}

export interface LocaleProviderRequirement {
  id: string;
  workspaceId?: string | null;
  marketplaceKey: string;
  countryCode?: string | null;
  requiredLocaleCode: string;
  requiredCurrencyCode?: string | null;
  requiredTimezone?: string | null;
  requiredMeasurementSystem?: MeasurementSystem | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetProviderRequirementPayload {
  workspaceId?: string;
  marketplaceKey: string;
  countryCode?: string;
  requiredLocaleCode: string;
  requiredCurrencyCode?: string;
  requiredTimezone?: string;
  requiredMeasurementSystem?: MeasurementSystem;
}

// ── Regional Settings (`regional-settings` module) ──────────────
export type RegionalSettingsScopeType = 'GLOBAL' | 'COUNTRY' | 'REGION' | 'ORGANIZATION' | 'WORKSPACE';
export type RegionalSettingsStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface RegionalSettingsProfile {
  id: string;
  key: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeType: RegionalSettingsScopeType;
  countryCode?: string | null;
  regionCode?: string | null;
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys: string[];
  supplierIds: string[];
  warehouseIds: string[];
  fulfillmentProviderKeys: string[];
  paymentProviderKeys: string[];
  workingDays: number[];
  businessHours: Record<string, unknown>;
  holidays: Array<{ date: string; name: string }>;
  pricingPreferences: Record<string, unknown>;
  shippingPreferences: Record<string, unknown>;
  fulfillmentPreferences: Record<string, unknown>;
  availabilityPreferences: Record<string, unknown>;
  priority: number;
  status: RegionalSettingsStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RegionalSettingsProfileFilterParams {
  key?: string;
  workspaceId?: string;
  organizationId?: string;
  scopeType?: RegionalSettingsScopeType;
  countryCode?: string;
  regionCode?: string;
  status?: RegionalSettingsStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateRegionalSettingsProfilePayload {
  key: string;
  workspaceId?: string;
  organizationId?: string;
  scopeType: RegionalSettingsScopeType;
  countryCode?: string;
  regionCode?: string;
  localeCode?: string;
  languageCode?: string;
  currencyCode?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: Record<string, unknown>;
  measurementSystem?: string;
  addressFormat?: Record<string, unknown>;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  marketplaceKeys?: string[];
  supplierIds?: string[];
  warehouseIds?: string[];
  fulfillmentProviderKeys?: string[];
  paymentProviderKeys?: string[];
  workingDays?: number[];
  businessHours?: Record<string, unknown>;
  holidays?: Array<{ date: string; name: string }>;
  pricingPreferences?: Record<string, unknown>;
  shippingPreferences?: Record<string, unknown>;
  fulfillmentPreferences?: Record<string, unknown>;
  availabilityPreferences?: Record<string, unknown>;
  priority?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateRegionalSettingsProfilePayload = Partial<Omit<CreateRegionalSettingsProfilePayload, 'key' | 'scopeType' | 'effectiveFrom'>> & { changeReason?: string };

export interface RollbackRegionalSettingsProfilePayload {
  toVersion: number;
  reason?: string;
}

export interface RegionalSettingsProfileHistoryEntry {
  id: string;
  profileId: string;
  key: string;
  version: number;
  status: RegionalSettingsStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface ResolveRegionalSettingsPayload {
  organizationId?: string;
  countryCode?: string;
  regionCode?: string;
  effectiveDate?: string;
}

export interface RegionalSettingsEffective {
  localeCode?: string | null;
  languageCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  timeFormat?: string | null;
  numberFormat?: Record<string, unknown> | null;
  measurementSystem?: string | null;
  addressFormat?: Record<string, unknown> | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  marketplaceKeys: string[];
  supplierIds: string[];
  warehouseIds: string[];
  fulfillmentProviderKeys: string[];
  paymentProviderKeys: string[];
  workingDays: number[];
  businessHours: Record<string, unknown>;
  holidays: Array<{ date: string; name: string }>;
  pricingPreferences: Record<string, unknown>;
  shippingPreferences: Record<string, unknown>;
  fulfillmentPreferences: Record<string, unknown>;
  availabilityPreferences: Record<string, unknown>;
  sources: Record<string, string>;
  contributingProfileIds: string[];
}

// ── Theme Management (`theme-management` module) ─────────────────
export type ThemeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ThemeScope = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE';

export interface ThemeColorTokens {
  background?: string;
  surface?: string;
  text?: string;
  primary?: string;
  onPrimary?: string;
  secondary?: string;
  onSecondary?: string;
  border?: string;
  [token: string]: string | undefined;
}

export interface ThemeModeTokens {
  colors: ThemeColorTokens;
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  radius?: Record<string, unknown>;
  shadows?: Record<string, unknown>;
  components?: Record<string, unknown>;
}

export interface ThemeTokens {
  light: ThemeModeTokens;
  dark: ThemeModeTokens;
}

export interface Theme {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope: ThemeScope;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isBranded: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  tokens: ThemeTokens;
  version: number;
  status: ThemeStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeFilterParams {
  scope?: ThemeScope;
  status?: ThemeStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateThemePayload {
  key: string;
  name: string;
  description?: string;
  scope?: ThemeScope;
  organizationId?: string;
  isBranded?: boolean;
  logoUrl?: string;
  faviconUrl?: string;
  accentColor?: string;
  tokens: ThemeTokens;
}

export type UpdateThemePayload = Partial<Omit<CreateThemePayload, 'key' | 'tokens'>> & { tokens?: ThemeTokens };

export interface ThemeHistoryEntry {
  id: string;
  themeId: string;
  fromStatus?: ThemeStatus | null;
  toStatus: ThemeStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface ContrastWarning {
  pair: string;
  ratio: number;
  minimumRequired: number;
  mode: 'light' | 'dark';
}

export interface EffectiveTheme {
  theme: Theme;
  mode: string;
  density: string;
  source: string;
}

export interface SetActiveThemePayload {
  themeKey: string;
  scope?: ThemeScope;
  organizationId?: string;
}

export interface RollbackThemePayload {
  historyId: string;
  changeReason?: string;
}

// ── SaaS Subscription Management (`subscription-management` module) ─────────
export type SubscriptionScope = 'ORGANIZATION' | 'WORKSPACE';
export type SubscriptionType = 'TRIAL' | 'PAID' | 'INTERNAL' | 'CUSTOM' | 'ENTERPRISE';
export type SubscriptionBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
export type SubscriptionChangeType =
  | 'CREATED'
  | 'ACTIVATED'
  | 'PLAN_CHANGED'
  | 'PAUSED'
  | 'RESUMED'
  | 'SUSPENDED'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'RENEWED'
  | 'EXPIRED'
  | 'ADMIN_OVERRIDE';
export type PlanChangeEffective = 'IMMEDIATE' | 'END_OF_PERIOD';
export type PlanChangeDirection = 'UPGRADE' | 'DOWNGRADE' | 'LATERAL';

export interface ScheduledSubscriptionChange {
  toPlanKey: string;
  toBillingCycle?: SubscriptionBillingCycle;
  changeType: PlanChangeDirection;
  effectiveAt: string;
  reason?: string | null;
}

export interface SubscriptionProrationReference {
  amount: number;
  currency?: string;
  description?: string;
  calculatedAt: string;
}

export interface Subscription {
  id: string;
  scope: SubscriptionScope;
  organizationId: string | null;
  workspaceId: string | null;
  type: SubscriptionType;
  planKey: string;
  billingCycle: SubscriptionBillingCycle;
  customBillingCycleDays: number | null;
  status: SubscriptionStatus;
  trialStartAt: string | null;
  trialEndAt: string | null;
  startAt: string;
  endAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string | null;
  gracePeriodDays: number;
  gracePeriodEndsAt: string | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pausedAt: string | null;
  suspendedAt: string | null;
  scheduledChange: ScheduledSubscriptionChange | null;
  prorationReference: SubscriptionProrationReference | null;
  isAdminOverride: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  subscriptionId: string;
  changeType: SubscriptionChangeType;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  fromPlanKey: string | null;
  toPlanKey: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface SubscriptionEntitlement {
  subscriptionId: string;
  scope: SubscriptionScope;
  status: SubscriptionStatus;
  type: SubscriptionType;
  planKey: string;
  isTrial: boolean;
  isActive: boolean;
}

export interface CreateSubscriptionPayload {
  scope: SubscriptionScope;
  organizationId?: string;
  type: SubscriptionType;
  planKey: string;
  billingCycle: SubscriptionBillingCycle;
  customBillingCycleDays?: number;
  trialDays?: number;
  gracePeriodDays?: number;
  autoRenew?: boolean;
  allowMultipleActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChangeSubscriptionPlanPayload {
  toPlanKey: string;
  toBillingCycle?: SubscriptionBillingCycle;
  changeType: PlanChangeDirection;
  effective: PlanChangeEffective;
  reason?: string;
}

export interface CancelSubscriptionPayload {
  immediate?: boolean;
  reason?: string;
}

export interface AdminOverrideSubscriptionPayload {
  toStatus: SubscriptionStatus;
  reason: string;
}

export interface SubscriptionReasonPayload {
  reason?: string;
}

export interface SubscriptionFilterParams {
  scope?: SubscriptionScope;
  status?: SubscriptionStatus;
  type?: SubscriptionType;
  planKey?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Plan Management (`plan-management` module) ─────────
export type PlanType = 'FREE' | 'TRIAL' | 'STANDARD' | 'PREMIUM' | 'ENTERPRISE' | 'CUSTOM';
export type PlanStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED';
export type PlanBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';
export type PlanChangeType = 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'DEPRECATED' | 'ARCHIVED' | 'RESTORED' | 'NEW_VERSION';
export type PlanOverageRule = 'BLOCK' | 'ALLOW' | 'ALLOW_WITH_CHARGE' | 'GRACE_THEN_BLOCK';

export interface PlanPrice {
  currency: string;
  billingCycle: PlanBillingCycle;
  amount: number;
}

export interface PlanEntitlement {
  module: string;
  feature: string;
  capability?: string;
  resource?: string;
  included: boolean;
  value?: unknown;
}

export interface PlanLimit {
  resourceKey: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: PlanOverageRule;
}

export interface PlanDependencies {
  requiresPlanCodes?: string[];
  incompatibleWithPlanCodes?: string[];
}

export interface BlockedPlanTransition {
  toCode: string;
  reason: string;
}

export interface PlanMigrationRules {
  allowedDirectUpgradeCodes?: string[];
  allowedDirectDowngradeCodes?: string[];
  blockedTransitions?: BlockedPlanTransition[];
}

export interface Plan {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string | null;
  tier: string;
  tierRank: number;
  type: PlanType;
  status: PlanStatus;
  supportedBillingCycles: PlanBillingCycle[];
  customBillingCycleDays: number | null;
  prices: PlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: PlanEntitlement[];
  limits: PlanLimit[];
  dependencies: PlanDependencies | null;
  migrationRules: PlanMigrationRules | null;
  effectiveAt: string;
  publishedAt: string | null;
  deprecatedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanHistoryEntry {
  id: string;
  planId: string;
  code: string;
  version: number;
  changeType: PlanChangeType;
  fromStatus: PlanStatus | null;
  toStatus: PlanStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface PlanEntitlementSnapshot {
  code: string;
  version: number;
  status: PlanStatus;
  type: PlanType;
  tier: string;
  tierRank: number;
  effectiveAt: string;
  prices: PlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: PlanEntitlement[];
  limits: PlanLimit[];
  entitlementsByKey: Record<string, PlanEntitlement>;
  limitsByKey: Record<string, PlanLimit>;
}

export interface PlanCompatibilityResult {
  compatible: boolean;
  direction: string;
  reason?: string;
}

export interface CreatePlanPayload {
  code: string;
  name: string;
  description?: string;
  tier: string;
  tierRank?: number;
  type: PlanType;
  supportedBillingCycles: PlanBillingCycle[];
  customBillingCycleDays?: number;
  prices?: PlanPrice[];
  availableCountries?: string[];
  availableRegions?: string[];
  entitlements?: PlanEntitlement[];
  limits?: PlanLimit[];
  dependencies?: PlanDependencies;
  migrationRules?: PlanMigrationRules;
}

export interface UpdatePlanPayload {
  name?: string;
  description?: string;
  tier?: string;
  tierRank?: number;
  supportedBillingCycles?: PlanBillingCycle[];
  customBillingCycleDays?: number;
  prices?: PlanPrice[];
  availableCountries?: string[];
  availableRegions?: string[];
  entitlements?: PlanEntitlement[];
  limits?: PlanLimit[];
  dependencies?: PlanDependencies;
  migrationRules?: PlanMigrationRules;
  changeReason: string;
}

export interface PublishPlanPayload {
  effectiveAt?: string;
  reason?: string;
}

export interface PlanReasonPayload {
  reason?: string;
}

export interface PlanFilterParams {
  code?: string;
  status?: PlanStatus;
  type?: PlanType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Billing Engine (`billing-engine` module) ─────────
export type BillingRuleScope = 'GLOBAL' | 'PLAN' | 'TENANT' | 'REGION';
export type ProrationStrategy = 'DAILY' | 'NONE' | 'FULL_PERIOD';
export type BillingPeriodStatus = 'PENDING' | 'BILLED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOIDED' | 'REFUNDED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM' | 'ONE_TIME';
export type BillingTriggerType = 'SCHEDULED' | 'MANUAL' | 'PLAN_CHANGE' | 'ONE_TIME';
export type BillingItemType = 'BASE_CHARGE' | 'PRORATION' | 'DISCOUNT' | 'CREDIT' | 'TAX' | 'OVERAGE' | 'ADJUSTMENT' | 'ONE_TIME_CHARGE';
export type BillingHistoryChangeType = 'GENERATED' | 'BILLED' | 'PAYMENT_RECORDED' | 'VOIDED' | 'REFUNDED' | 'RECONCILED' | 'ADJUSTED';

export interface OverageRate {
  resourceKey: string;
  rate: number;
  unit?: string;
}

export interface BillingRule {
  id: string;
  scope: BillingRuleScope;
  workspaceId: string | null;
  organizationId: string | null;
  planKey: string | null;
  country: string | null;
  region: string | null;
  priority: number;
  taxRatePercent: number | null;
  prorationStrategy: ProrationStrategy;
  gracePeriodDays: number | null;
  overageRates: OverageRate[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingItem {
  id: string;
  billingPeriodId: string;
  type: BillingItemType;
  description: string;
  quantity: number | null;
  unitAmount: number | null;
  amount: number;
  currency: string;
  planKey: string | null;
  resourceKey: string | null;
  calculationInput: Record<string, unknown> | null;
  createdAt: string;
}

export interface BillingPeriod {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  subscriptionId: string | null;
  triggerType: BillingTriggerType;
  billingCycle: BillingCycle;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  currency: string;
  status: BillingPeriodStatus;
  subtotal: number;
  discountTotal: number;
  creditTotal: number;
  taxTotal: number;
  overageTotal: number;
  adjustmentTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  externalReference: Record<string, unknown> | null;
  version: number;
  generatedAt: string;
  billedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  refundedAt: string | null;
  items?: BillingItem[];
}

export interface BillingHistoryEntry {
  id: string;
  billingPeriodId: string;
  changeType: BillingHistoryChangeType;
  fromStatus: BillingPeriodStatus | null;
  toStatus: BillingPeriodStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface BillingReconciliationReport {
  billingPeriodId: string;
  isConsistent: boolean;
  discrepancies: string[];
  checkedAt: string;
}

export interface CreateBillingRulePayload {
  scope: BillingRuleScope;
  organizationId?: string;
  planKey?: string;
  country?: string;
  region?: string;
  priority?: number;
  taxRatePercent?: number;
  prorationStrategy?: ProrationStrategy;
  gracePeriodDays?: number;
  overageRates?: OverageRate[];
  isActive?: boolean;
}

export interface UpdateBillingRulePayload {
  priority?: number;
  taxRatePercent?: number;
  prorationStrategy?: ProrationStrategy;
  gracePeriodDays?: number;
  overageRates?: OverageRate[];
  isActive?: boolean;
}

export interface BillingFilterParams {
  subscriptionId?: string;
  status?: BillingPeriodStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AdditionalBillingItemPayload {
  type: BillingItemType;
  description: string;
  amount: number;
  quantity?: number;
  unitAmount?: number;
  resourceKey?: string;
  calculationInput?: Record<string, unknown>;
}

export interface UsageOveragePayload {
  resourceKey: string;
  usageAmount: number;
  limit: number;
}

export interface GenerateBillingPeriodPayload {
  subscriptionId?: string;
  organizationId?: string;
  planKey?: string;
  triggerType?: BillingTriggerType;
  billingCycle?: BillingCycle;
  customCycleDays?: number;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  currency?: string;
  baseAmount?: number;
  baseDescription?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  additionalItems?: AdditionalBillingItemPayload[];
  usageOverages?: UsageOveragePayload[];
  country?: string;
  region?: string;
  idempotencyKey?: string;
}

export interface AddBillingAdjustmentPayload {
  type?: BillingItemType;
  description: string;
  amount: number;
  reason: string;
}

export interface RecordBillingPaymentPayload {
  amount: number;
  paidAt?: string;
  externalReference?: Record<string, unknown>;
}

export interface RefundBillingPeriodPayload {
  amount?: number;
  reason: string;
}

export interface BillingReasonPayload {
  reason: string;
}

// ── Invoice Management (`invoice-management` module) ─────────
export type InvoiceType = 'STANDARD' | 'PROFORMA' | 'CREDIT_NOTE' | 'ONE_TIME';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOIDED' | 'CANCELLED' | 'REFUNDED';
export type InvoiceDeliveryStatus = 'NOT_SENT' | 'QUEUED' | 'SENT' | 'FAILED' | 'DELIVERED';
export type InvoiceChangeType = 'GENERATED' | 'ISSUED' | 'SENT' | 'DOWNLOADED' | 'VOIDED' | 'CANCELLED' | 'ARCHIVED' | 'RESTORED' | 'PAID' | 'REFUNDED';

export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unitAmount?: number;
  amount: number;
  type?: string;
  resourceKey?: string;
}

export interface InvoiceTaxBreakdownEntry {
  label: string;
  ratePercent: number;
  amount: number;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  subtotal: number;
  discountTotal: number;
  creditTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  lineItems: InvoiceLineItem[];
  taxBreakdown: InvoiceTaxBreakdownEntry[];
  issueDate: string | null;
  dueDate: string;
  documentId: string | null;
  deliveryStatus: InvoiceDeliveryStatus;
  deliveredAt: string | null;
  lastSentAt: string | null;
  sendAttempts: number;
  downloadCount: number;
  paymentReference: Record<string, unknown> | null;
  refundReference: Record<string, unknown> | null;
  creditNoteReference: Record<string, unknown> | null;
  externalReference: Record<string, unknown> | null;
  voidedAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceHistoryEntry {
  id: string;
  invoiceId: string;
  changeType: InvoiceChangeType;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface GenerateInvoicePayload {
  billingPeriodId: string;
  type?: InvoiceType;
  idempotencyKey?: string;
}

export interface InvoiceFilterParams {
  subscriptionId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
  search?: string;
  includeArchived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AttachInvoiceDocumentPayload {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export interface SendInvoicePayload {
  targetUserId?: string;
}

export interface InvoiceReasonPayload {
  reason: string;
}

// ── Payment Provider Framework (`payment-provider` module) ─────────
export type PaymentProviderAccountStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ERROR';
export type PaymentHealthState = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
export type PaymentTransactionType = 'PAYMENT' | 'REFUND' | 'CAPTURE' | 'AUTHORIZATION';
export type PaymentTransactionStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface PaymentProviderAccount {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountHandle: string;
  displayName: string | null;
  country: string | null;
  currency: string | null;
  status: PaymentProviderAccountStatus;
  priority: number;
  isDefault: boolean;
  capabilities: string[];
  supportedCountries: string[];
  supportedCurrencies: string[];
  healthState: PaymentHealthState;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  invoiceId: string | null;
  type: PaymentTransactionType;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  capturedAmount: number | null;
  refundedAmount: number;
  externalTransactionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHealthResult {
  providerKey: string;
  accountId?: string;
  state: PaymentHealthState;
  connectionStatus: PaymentConnectionStatus;
  responseTimeMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface PaymentConnectionTestResult {
  correlationId: string;
  providerKey: string;
  accountId: string;
  success: boolean;
  connectionStatus: PaymentConnectionStatus;
  responseTimeMs: number;
  errorMessage?: string;
  testedAt: string;
}

export interface RegisterPaymentProviderAccountPayload {
  providerKey: string;
  accountHandle: string;
  displayName?: string;
  country?: string;
  currency?: string;
  priority?: number;
  isDefault?: boolean;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
}

export interface UpdatePaymentProviderAccountPayload {
  displayName?: string;
  status?: PaymentProviderAccountStatus;
  priority?: number;
  isDefault?: boolean;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
}

/** Plain-text values submitted once — the backend encrypts immediately and never echoes them back; never store or render these values client-side after submission. */
export interface ConfigurePaymentCredentialsPayload {
  fields: Record<string, string>;
}

export interface PaymentCustomerInput {
  externalCustomerId?: string;
  email?: string;
  name?: string;
}

export interface PaymentMethodInput {
  type: string;
  token?: string;
}

export interface CreatePaymentPayload {
  accountId?: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  customer?: PaymentCustomerInput;
  paymentMethod?: PaymentMethodInput;
  description?: string;
  country?: string;
  capture?: boolean;
  invoiceId?: string;
  billingPeriodId?: string;
  subscriptionId?: string;
  metadata?: Record<string, unknown>;
}

export interface CapturePaymentPayload {
  amount?: number;
}

export interface RefundPaymentPayload {
  amount?: number;
  reason?: string;
  idempotencyKey: string;
}

export interface TransactionFilterParams {
  accountId?: string;
  invoiceId?: string;
  status?: PaymentTransactionStatus;
  type?: PaymentTransactionType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Usage Tracking (`usage-tracking` module) ─────────
// Note: `ResourceUsage*` prefix (rather than bare `Usage*`) avoids collision with the
// pre-existing AI usage-monitoring module's `Usage*`/`AiUsage*` types, which track a
// different thing (LLM token/request cost, not metered plan-limit resource consumption).
export type ResourceUsageRecordSource = 'API' | 'SYSTEM' | 'MANUAL' | 'IMPORT' | 'SCHEDULED';
export type ResourceUsageThresholdLevel = 'NORMAL' | 'APPROACHING' | 'WARNING' | 'GRACE' | 'EXCEEDED';

export interface ResourceUsageRecord {
  id: string;
  workspaceId: string;
  module: string;
  feature: string | null;
  resourceKey: string;
  quantity: number;
  unit: string;
  source: ResourceUsageRecordSource;
  correlationId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  occurredAt: string;
  recordedAt: string;
  isReversed: boolean;
}

export interface ResourceUsageCorrection {
  id: string;
  workspaceId: string;
  originalRecordId: string;
  correctionType: string;
  quantityDelta: number;
  reason: string;
  changedBy: string | null;
  createdAt: string;
}

export interface ResourceUsageBucket {
  bucketStart: string;
  totalQuantity: number;
  recordCount: number;
}

export interface ResourceUsageLimitReference {
  resourceKey: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: string;
}

export interface ResourceUsageEntitlementComparison {
  workspaceId: string;
  resourceKey: string;
  unit: string;
  currentUsage: number;
  limit: ResourceUsageLimitReference | null;
  remaining: number | null;
  overageAmount: number;
  thresholdLevel: ResourceUsageThresholdLevel;
  forecastedUsage: number | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ResourceUsageSummary {
  workspaceId: string;
  resourceKey: string;
  unit: string;
  currentPeriodUsage: number;
  allTimeUsage: number;
  comparison: ResourceUsageEntitlementComparison | null;
}

export interface RecordResourceUsagePayload {
  module: string;
  feature?: string;
  resourceKey: string;
  quantity: number;
  unit: string;
  source?: ResourceUsageRecordSource;
  correlationId?: string;
  billingPeriodId?: string;
  subscriptionId?: string;
  occurredAt?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface BatchRecordResourceUsagePayload {
  records: RecordResourceUsagePayload[];
}

export interface AdjustResourceUsagePayload {
  quantityDelta: number;
  reason: string;
}

export interface ReverseResourceUsagePayload {
  reason: string;
}

export interface ResourceUsageFilterParams {
  resourceKey?: string;
  module?: string;
  billingPeriodId?: string;
  subscriptionId?: string;
  source?: ResourceUsageRecordSource;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ResourceUsageBreakdownFilterParams {
  resourceKey: string;
  bucket: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
  startDate: string;
  endDate: string;
}

// ── Quota Management (`quota-management` module) ─────────
export type QuotaScopeType = 'WORKSPACE' | 'ORGANIZATION' | 'USER' | 'PLAN';
export type QuotaResetSchedule = 'NEVER' | 'DAILY' | 'MONTHLY' | 'ANNUAL' | 'CUSTOM' | 'BILLING_PERIOD';
export type QuotaPolicyStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type QuotaOverrideStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
export type QuotaEnforcementState = 'OK' | 'WARNING' | 'GRACE' | 'EXCEEDED' | 'BLOCKED';

export interface QuotaPolicy {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: QuotaScopeType;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  planKey: string | null;
  unit: string | null;
  softLimit: number | null;
  hardLimit: number | null;
  graceThreshold: number | null;
  overageAllowed: boolean;
  overageLimit: number | null;
  resetSchedule: QuotaResetSchedule;
  customResetIntervalDays: number | null;
  status: QuotaPolicyStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaOverride {
  id: string;
  policyId: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  additionalHardLimit: number | null;
  reason: string;
  status: QuotaOverrideStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaState {
  id: string;
  workspaceId: string | null;
  scopeKey: string;
  resourceKey: string;
  feature: string;
  state: QuotaEnforcementState;
  consumedAtLastCheck: number;
  limitAtLastCheck: number | null;
  lastEvaluatedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  lastResetAt: string | null;
  nextResetAt: string | null;
}

export interface QuotaHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  resourceKey: string;
  changeType: string;
  fromValue: unknown;
  toValue: unknown;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  state: QuotaEnforcementState;
  resourceKey: string;
  feature: string;
  consumed: number;
  limit: number | null;
  remaining: number | null;
  overage: number;
  reason?: string;
}

export interface CheckQuotaPayload {
  resourceKey: string;
  feature?: string;
  requestedQuantity?: number;
}

export interface CreateQuotaPolicyPayload {
  scopeType: QuotaScopeType;
  organizationId?: string;
  ownerUserId?: string;
  planKey?: string;
  resourceKey: string;
  feature?: string;
  unit?: string;
  softLimit?: number;
  hardLimit?: number;
  graceThreshold?: number;
  overageAllowed?: boolean;
  overageLimit?: number;
  resetSchedule?: QuotaResetSchedule;
  customResetIntervalDays?: number;
}

export interface UpdateQuotaPolicyPayload {
  unit?: string;
  softLimit?: number;
  hardLimit?: number;
  graceThreshold?: number;
  overageAllowed?: boolean;
  overageLimit?: number;
  resetSchedule?: QuotaResetSchedule;
  customResetIntervalDays?: number;
}

export interface QuotaPolicyFilterParams {
  scopeType?: QuotaScopeType;
  status?: QuotaPolicyStatus;
  resourceKey?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateQuotaOverridePayload {
  additionalHardLimit?: number;
  reason: string;
  expiresAt?: string;
}

export interface QuotaOverrideFilterParams {
  status?: QuotaOverrideStatus;
  resourceKey?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface QuotaReasonPayload {
  reason?: string;
}

// ── License Management (`license-management` module) ─────────
export type LicenseScopeType = 'WORKSPACE' | 'ORGANIZATION' | 'USER' | 'ENVIRONMENT' | 'DEPLOYMENT';
export type LicenseType = 'TRIAL' | 'STANDARD' | 'ENTERPRISE' | 'INTERNAL' | 'OEM';
export type LicenseStatus = 'PENDING' | 'ISSUED' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';

export interface License {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: LicenseScopeType;
  scopeKey: string;
  ownerUserId: string | null;
  environment: string | null;
  deploymentId: string | null;
  type: LicenseType;
  status: LicenseStatus;
  planKey: string;
  subscriptionId: string | null;
  entitlementsSnapshotAt: string | null;
  featureFlagKeys: string[];
  licenseKeyId: string;
  publicKey: string;
  maxActivations: number | null;
  activationCount: number;
  issuedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  gracePeriodDays: number;
  gracePeriodEndsAt: string | null;
  lastValidatedAt: string | null;
  lastValidationResult: string | null;
  externalReference: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Returned only once, at issue/rotation time — the only response shape carrying the signed offline token; never persisted or re-fetchable, so the UI must prompt the user to copy/save it immediately. */
export interface LicenseIssuedToken {
  license: License;
  token: string;
  publicKey: string;
}

export interface LicenseHistoryEntry {
  id: string;
  licenseId: string;
  changeType: string;
  fromStatus: LicenseStatus | null;
  toStatus: LicenseStatus | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  reason?: string;
}

export interface LicenseOfflineVerificationResult {
  valid: boolean;
  reason?: string;
}

export interface CreateLicensePayload {
  scopeType: LicenseScopeType;
  organizationId?: string;
  ownerUserId?: string;
  environment?: string;
  deploymentId?: string;
  type: LicenseType;
  planKey: string;
  subscriptionId?: string;
  featureFlagKeys?: string[];
  maxActivations?: number;
  expiresAt?: string;
  gracePeriodDays?: number;
  externalReference?: string;
}

export interface UpdateLicensePayload {
  featureFlagKeys?: string[];
  maxActivations?: number;
  gracePeriodDays?: number;
  externalReference?: string;
}

export interface ActivateLicensePayload {
  deploymentId?: string;
  environment?: string;
}

export interface RenewLicensePayload {
  expiresAt: string;
  gracePeriodDays?: number;
}

export interface TransferLicensePayload {
  scopeType: LicenseScopeType;
  targetWorkspaceId?: string;
  organizationId?: string;
  ownerUserId?: string;
  environment?: string;
  deploymentId?: string;
  reason: string;
}

export interface ValidateLicensePayload {
  licenseKeyId: string;
  deploymentId?: string;
  environment?: string;
}

export interface VerifyLicenseTokenOfflinePayload {
  token: string;
  publicKey: string;
}

export interface LicenseFilterParams {
  scopeType?: LicenseScopeType;
  type?: LicenseType;
  status?: LicenseStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LicenseReasonPayload {
  reason?: string;
}

// ── Monitoring (system/provider health) ───────────────────────
export type MonitoringHealthLevel = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE' | 'MAINTENANCE' | 'UNKNOWN';

export interface MonitoringSignal {
  sourceKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  service?: string;
  provider?: string;
  environment?: string;
  region?: string;
  level: MonitoringHealthLevel;
  availability?: number;
  latencyMs?: number;
  throughput?: number;
  errorRate?: number;
  saturation?: number;
  queueBacklog?: number;
  retries?: number;
  message?: string;
  checkedAt: string;
  raw?: Record<string, unknown>;
}

export interface MonitoringDashboard {
  scope: 'PLATFORM' | 'WORKSPACE';
  workspaceId?: string;
  overallLevel: MonitoringHealthLevel;
  sources: MonitoringSignal[];
  openIncidentCount: number;
  generatedAt: string;
}

// ── Dashboard Framework (saved views / export) ────────────────
export type DashboardStatus = 'draft' | 'published' | 'archived';
export type RefreshInterval = 'manual' | 'realtime' | 'every_minute' | 'every_5_minutes' | 'every_15_minutes' | 'every_hour' | 'every_day';

export interface SavedDashboard {
  id: string;
  workspaceId: string;
  dashboardKey: string;
  name: string;
  description?: string;
  status: DashboardStatus;
  layout: { columns: number; rows: number; gap: number; padding: number };
  isTemplate: boolean;
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  refreshInterval: RefreshInterval;
  metadata?: Record<string, unknown>;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedDashboardPayload {
  workspaceId: string;
  dashboardKey: string;
  name: string;
  description?: string;
  layout: SavedDashboard['layout'];
  createdBy: string;
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  refreshInterval?: RefreshInterval;
}

export interface UpdateSavedDashboardPayload {
  name?: string;
  description?: string;
  filters?: Record<string, unknown>;
  dateRange?: { start: string; end: string };
  refreshInterval?: RefreshInterval;
  metadata?: Record<string, unknown>;
}

export type DashboardExportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export interface DashboardExport {
  id: string;
  dashboardId: string;
  workspaceId: string;
  exportFormat: DashboardExportFormat;
  fileUrl?: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

// ── Opportunities (`opportunities` module) ───────────────────
export type OpportunityStatus = 'DISCOVERED' | 'ANALYZING' | 'VALIDATED' | 'IN_PROGRESS' | 'REJECTED' | 'ARCHIVED';

export interface Opportunity {
  id: string;
  workspaceId: string;
  keyword: string;
  marketplace: string;
  country: string;
  category?: string | null;
  /** Set when this Opportunity was created by promoting a MarketplaceProductCandidate; null for manual opportunities. */
  marketplaceProductCandidateId?: string | null;
  demandScore?: number | null;
  competitionScore?: number | null;
  supplierScore?: number | null;
  profitScore?: number | null;
  aiScore?: number | null;
  finalScore?: number | null;
  recommendation?: string | null;
  status: OpportunityStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpportunityPayload {
  keyword: string;
  marketplace: string;
  country?: string;
  category?: string;
  demandScore?: number;
  competitionScore?: number;
  supplierScore?: number;
  profitScore?: number;
  aiScore?: number;
  finalScore?: number;
  recommendation?: string;
  status?: OpportunityStatus;
  notes?: string;
}

export type UpdateOpportunityPayload = Partial<CreateOpportunityPayload>;

export interface OpportunityFilterParams extends PaginationParams {
  status?: OpportunityStatus;
  marketplace?: string;
  keyword?: string;
  minFinalScore?: number;
  maxFinalScore?: number;
}

export interface OpportunityListResult {
  items: Opportunity[];
  total: number;
  page: number;
  limit: number;
}

// ── Discovery (`discovery` module) ────────────────────────────
export type DiscoverySessionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DiscoverySession {
  id: string;
  workspaceId: string;
  marketplace: string;
  country: string;
  categories: string[];
  keywords: string[];
  status: DiscoverySessionStatus;
  totalDiscovered: number;
  /** Newly discovered marketplace product candidates — the correct field to use. */
  newCandidates: number;
  /** @deprecated Same value as `newCandidates`. Discovery no longer auto-creates Opportunity records — do not treat this as a count of Opportunities. */
  newOpportunities: number;
  duplicatesSkipped: number;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscoverySessionPayload {
  marketplace: string;
  country?: string;
  keywords: string[];
  categories?: string[];
}

export interface DiscoverySessionListResult {
  items: DiscoverySession[];
  total: number;
  page: number;
  limit: number;
}

export interface DiscoveryStats {
  totalSessions: number;
  runningSessions: number;
  totalDiscovered: number;
  /** Newly discovered marketplace product candidates — the correct field to use. */
  totalNewCandidates: number;
  /** @deprecated Same value as `totalNewCandidates`. */
  totalNewOpportunities: number;
  totalDuplicatesSkipped: number;
  byMarketplace: Record<string, number>;
  byStatus: Record<string, number>;
}

// ── Product Taxonomy / Trend Discovery (`product-taxonomy` module) ──
export type TrendSignalClassification = 'RAW_PROVIDER' | 'ATLAS_DERIVED' | 'AI_EXPLANATION';
export type TrendConceptState = 'EMERGING_NEEDS_VALIDATION' | 'TREND_CANDIDATE';

export interface TrendSignalEvidence {
  source: string;
  classification: TrendSignalClassification;
  value: number | null;
  unit: string | null;
  capturedAt: string;
  rawPayload: Record<string, unknown> | null;
}

export interface TrendConcept {
  conceptId: string;
  conceptName: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Evidence-driven, never a score: EMERGING_NEEDS_VALIDATION = attention only; TREND_CANDIDATE = attention corroborated by an independent search-demand signal. */
  state: TrendConceptState;
  attentionSignal: TrendSignalEvidence | null;
  searchDemandSignal: TrendSignalEvidence | null;
}

// ── Product Scoring (`product-scoring` module) ────────────────
export type AnalysisRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ScoreRecommendation = 'BUY' | 'REVIEW' | 'REJECT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ProductScore {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  status: AnalysisRunStatus;
  finalScore?: number | null;
  demandScore?: number | null;
  competitionScore?: number | null;
  profitScore?: number | null;
  supplierScore?: number | null;
  weights?: Record<string, number> | null;
  recommendation?: ScoreRecommendation | null;
  confidenceLevel?: ConfidenceLevel | null;
  confidenceScore?: number | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  riskLevel?: RiskLevel | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Product Analysis (`product-analysis` module) ──────────────
export interface ProductAnalysis {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  status: AnalysisRunStatus;
  demandAnalysis?: Record<string, unknown>;
  competitionAnalysis?: Record<string, unknown>;
  profitCalculation?: Record<string, unknown>;
  supplierAnalysis?: Record<string, unknown>;
  demandScore?: number;
  competitionScore?: number;
  profitScore?: number;
  supplierScore?: number;
  finalScore?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Profit Calculator (`profit-calculator` module) ─────────────
export type ProfitProvider = 'AMAZON_FBA' | 'AMAZON_FBM' | 'MANUAL';

export interface ProfitCalculation {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  provider: ProfitProvider;
  status: AnalysisRunStatus;
  productCost?: number | null;
  shippingCost?: number | null;
  packagingCost?: number | null;
  advertisingCost?: number | null;
  tax?: number | null;
  marketplaceFees?: number | null;
  fbaFees?: number | null;
  totalLandedCost?: number | null;
  sellingPrice?: number | null;
  grossProfit?: number | null;
  netProfit?: number | null;
  profitMargin?: number | null;
  roi?: number | null;
  breakEvenPrice?: number | null;
  profitScore?: number | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfitCalculationPayload {
  opportunityId: string;
  provider?: ProfitProvider;
  productCost?: number;
  shippingCost?: number;
  packagingCost?: number;
  advertisingCost?: number;
  taxRate?: number;
  sellingPrice?: number;
}

// ── Listings (`listing` module — universal + marketplace) ─────
export type ListingStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'MANUALLY_EDITED' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
export type MarketplaceListingStatus = 'PENDING_TRANSFORMATION' | 'TRANSFORMING' | 'TRANSFORMED' | 'VALIDATED' | 'VALIDATION_FAILED' | 'READY' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';

export type ListingSection =
  | 'TITLE'
  | 'BRAND'
  | 'CATEGORY'
  | 'DESCRIPTION'
  | 'BULLET_POINTS'
  | 'IMAGES'
  | 'VARIANTS'
  | 'ATTRIBUTES'
  | 'SPECIFICATIONS'
  | 'SEARCH_TERMS'
  | 'PRICING'
  | 'SEO';

export interface UniversalListing {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: string;
  version: number;
  aiDescriptionId?: string | null;
  aiImageSetId?: string | null;
  aiSeoId?: string | null;
  templateId?: string | null;
  content: Record<string, unknown>;
  qualityScore?: number | null;
  validationResult?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUniversalListingPayload {
  catalogProductId: string;
  aiDescriptionId?: string;
  aiImageSetId?: string;
  aiSeoId?: string;
  templateId?: string;
  sections?: ListingSection[];
}

export interface RegenerateUniversalListingPayload {
  sections: ListingSection[];
  aiDescriptionId?: string;
  aiImageSetId?: string;
  aiSeoId?: string;
}

export interface UniversalListingFilterParams extends PaginationParams {
  catalogProductId?: string;
  status?: string;
}

/** Universal listing list responses use the `data/totalPages` shape. */
export type UniversalListingListResult = PaginatedResult<UniversalListing>;

export interface MarketplaceListing {
  id: string;
  workspaceId: string;
  universalListingId: string;
  catalogProductId: string;
  marketplaceKey: string;
  country: string;
  status: MarketplaceListingStatus;
  version: number;
  schemaId?: string | null;
  schemaVersion?: string | null;
  transformedPayload?: Record<string, unknown> | null;
  fieldTrace?: unknown[] | null;
  readinessScore?: number | null;
  readinessStatus?: string | null;
  warnings?: unknown[] | null;
  errors?: unknown[] | null;
  validationResult?: Record<string, unknown> | null;
  isDryRun: boolean;
  errorMessage?: string | null;
  externalListingId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransformToMarketplacePayload {
  marketplaceKey: string;
  country?: string;
  isDryRun?: boolean;
}

export interface TransformToMultipleMarketplacesPayload {
  targets: TransformToMarketplacePayload[];
}

export interface MarketplaceListingFilterParams extends PaginationParams {
  universalListingId?: string;
  marketplaceKey?: string;
  country?: string;
  status?: string;
}

// ── Inventory availability (`inventory-availability` module) ──
export interface AvailabilitySnapshot {
  inventoryItemId: string;
  sku?: string | null;
  warehouseId?: string | null;
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  allocatedStock: number;
  blockedStock: number;
  damagedStock: number;
  inTransitStock: number;
  incomingStock: number;
  safetyStock: number;
  availableToSell: number;
  availableToPromise: number;
  uom: string;
  calculatedAt: string;
}

// ── Multi-business / multi-brand / multi-channel context ───
export interface Business {
  id: string;
  code: string;
  name: string;
  workspaceId: string;
  organizationId?: string | null;
  status: string;
  isDefault: boolean;
  priority: number;
  brandIds: string[];
}

export interface Brand {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  code: string;
  name: string;
  logoUrl?: string | null;
  status: string;
  isDefault: boolean;
  priority: number;
  countryCodes: string[];
}

export interface Channel {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
  channelType: string;
  channelKey: string;
  providerKey?: string | null;
  name: string;
  status: string;
  isDefault: boolean;
  priority: number;
  capabilities: string[];
}

// ── Product Cost Calculator (`product-cost` module) ─────────────────
export interface CostComponents {
  supplierUnitPrice: number;
  quantity: number;
  moq?: number | null;
  shippingCost?: number | null;
  freightCost?: number | null;
  customsDutyPercent?: number | null;
  importCharges?: number | null;
  packagingCostPerUnit?: number | null;
  labelingCostPerUnit?: number | null;
  inspectionCost?: number | null;
  miscCharges?: number | null;
  sourceCurrency?: string | null;
  targetCurrency?: string | null;
  exchangeRate?: number | null;
  taxPercent?: number | null;
}

export interface CostBreakdown {
  supplierUnitPrice: number;
  quantity: number;
  moq: number | null;
  supplierPriceSubtotal: number;
  moqImpact: number;
  shippingCost: number;
  freightCost: number;
  customsDuty: number;
  importCharges: number;
  packagingCost: number;
  labelingCost: number;
  inspectionCost: number;
  miscCharges: number;
  tax: number;
  totalLandedCost: number;
  costPerUnit: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
}

export interface ProductCostCalculation {
  id: string;
  workspaceId: string;
  productId?: string | null;
  opportunityId?: string | null;
  rfqId?: string | null;
  rfqSupplierId?: string | null;
  supplierId?: string | null;
  version: number;
  inputs: CostComponents;
  breakdown: CostBreakdown;
  totalLandedCost: number;
  costPerUnit: number;
  targetCurrency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CalculateProductCostPayload {
  productId?: string;
  opportunityId?: string;
  rfqId?: string;
  rfqSupplierId?: string;
  supplierId?: string;
  supplierUnitPrice: number;
  quantity: number;
  moq?: number;
  shippingCost?: number;
  freightCost?: number;
  customsDutyPercent?: number;
  importCharges?: number;
  packagingCostPerUnit?: number;
  labelingCostPerUnit?: number;
  inspectionCost?: number;
  miscCharges?: number;
  sourceCurrency?: string;
  targetCurrency?: string;
  exchangeRate?: number;
  taxPercent?: number;
  notes?: string;
}

export interface ProductCostFilterParams extends PaginationParams {
  productId?: string;
  opportunityId?: string;
  rfqId?: string;
  supplierId?: string;
  targetCurrency?: string;
}

export interface ProductCostListResult {
  items: ProductCostCalculation[];
  total: number;
  page: number;
  limit: number;
}

// ── Warehouse Receiving (`warehouse-receiving` module) ───────────────
export type ReceivingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIALLY_RECEIVED' | 'CANCELLED' | 'REOPENED';
export type ReceiptType = 'PURCHASE_ORDER' | 'TRANSFER' | 'RETURN' | 'MANUAL';
export type ReceiptLineStatus = 'PENDING' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'SHORT' | 'EXCESS' | 'DAMAGED' | 'REJECTED' | 'CANCELLED';
export type DiscrepancyType = 'SHORT' | 'EXCESS' | 'DAMAGED' | 'WRONG_PRODUCT' | 'QUALITY_ISSUE' | 'PACKAGING_ISSUE' | 'EXPIRY_ISSUE' | 'OTHER';

export interface ReceivingLine {
  id: string;
  receivingId: string;
  lineNumber: number;
  status: ReceiptLineStatus;
  inventoryItemId: string | null;
  catalogProductId: string | null;
  sku: string | null;
  productName: string | null;
  variantId: string | null;
  batchNumber: string | null;
  lotNumber: string | null;
  serialNumber: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  expectedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  uom: string;
  locationId: string | null;
  binId: string | null;
  stockStatus: string;
  packageCount: number | null;
  packageReference: string | null;
  hasDiscrepancy: boolean;
  discrepancyType: DiscrepancyType | null;
  discrepancyReason: string | null;
  discrepancyNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Receiving {
  id: string;
  workspaceId: string;
  receivingNumber: string;
  receivingSequence: number;
  status: ReceivingStatus;
  type: ReceiptType;
  warehouseId: string;
  purchaseOrderId: string | null;
  shipmentId: string | null;
  transferId: string | null;
  supplierId: string | null;
  scheduledDate: string | null;
  expectedQuantity: number | null;
  startedAt: string | null;
  completedAt: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  damagedQuantity: number;
  receivedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  attachments: unknown[];
  cancelReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  lines?: ReceivingLine[];
}

export interface CreateReceivingLinePayload {
  inventoryItemId?: string;
  catalogProductId?: string;
  sku?: string;
  productName?: string;
  batchNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  expectedQuantity: number;
  uom?: string;
  locationId?: string;
  binId?: string;
  packageReference?: string;
}

export interface CreateReceivingPayload {
  type: ReceiptType;
  warehouseId: string;
  purchaseOrderId?: string;
  shipmentId?: string;
  transferId?: string;
  supplierId?: string;
  scheduledDate?: string;
  expectedQuantity?: number;
  notes?: string;
  lines?: CreateReceivingLinePayload[];
}

export interface ReceiveLinePayload {
  lineId: string;
  receivedQuantity: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  damagedQuantity?: number;
  discrepancyType?: DiscrepancyType;
  discrepancyReason?: string;
  discrepancyNotes?: string;
}

export interface ReceiveLinesPayload {
  lines: ReceiveLinePayload[];
}

export interface ReceivingFilterParams extends PaginationParams {
  status?: ReceivingStatus;
  type?: ReceiptType;
  warehouseId?: string;
  purchaseOrderId?: string;
  shipmentId?: string;
  supplierId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
}

/** Receiving list responses use the `items/totalPages` shape (backend computes `totalPages` explicitly, unlike the plain `items` shape used elsewhere). */
export interface ReceivingListResult {
  items: Receiving[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Warehouse (`warehouse` module) — minimal read-only slice used for the receiving warehouse selector ──
export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  status: string;
  isDefault: boolean;
}

/** Warehouse list responses use the `data/totalPages` shape (matches the generic `PaginatedResult`). */
export type WarehouseListResult = PaginatedResult<WarehouseSummary>;

// ── Marketplace Provider (`marketplace-provider` module) — provider registry, config, credentials, health, capabilities ──
export type MarketplaceCapability =
  | 'PUBLISH_LISTING'
  | 'UPDATE_LISTING'
  | 'DELETE_LISTING'
  | 'GET_LISTING'
  | 'SEARCH_LISTINGS'
  | 'BULK_LISTING'
  | 'SYNC_INVENTORY'
  | 'UPDATE_INVENTORY'
  | 'GET_INVENTORY'
  | 'SYNC_ORDERS'
  | 'GET_ORDER'
  | 'UPDATE_ORDER'
  | 'CANCEL_ORDER'
  | 'SYNC_SHIPMENTS'
  | 'CREATE_SHIPMENT'
  | 'GET_SHIPMENT'
  | 'TRACK_SHIPMENT';

export interface MarketplaceProviderMetadata {
  providerKey: string;
  displayName: string;
  description: string;
  version: string;
  supportedCountries: string[];
  supportedCapabilities: MarketplaceCapability[];
  supportedMarketplaces: string[];
  isRegistered: boolean;
  isActive: boolean;
}

export interface MarketplaceProviderConfig {
  id: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  isEnabled: boolean;
  priority: number;
  credentialType?: string | null;
  credentialExpiresAt?: string | null;
  credentialValidatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMarketplaceProviderConfigPayload {
  providerKey: string;
  accountId?: string;
  isEnabled?: boolean;
  priority?: number;
  configuration?: Record<string, unknown>;
  credentialType?: string;
}

export interface SetMarketplaceCredentialsPayload {
  providerKey: string;
  accountId?: string;
  credentialType: string;
  fields: Record<string, string>;
}

export interface MarketplaceProviderHealth {
  providerKey: string;
  accountId?: string | null;
  isHealthy: boolean;
  lastCheckedAt?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  [key: string]: unknown;
}

// ── Marketplace Account (`marketplace-account` module) — the primary, richer per-workspace account entity ──
export type MarketplaceAccountStatus = 'DRAFT' | 'PENDING_VALIDATION' | 'ACTIVE' | 'DISABLED' | 'INVALID' | 'EXPIRED' | 'SUSPENDED' | 'ARCHIVED';

export interface MarketplaceAccount {
  id: string;
  workspaceId: string;
  providerKey: string;
  marketplaceKey: string;
  accountName: string;
  externalAccountId: string;
  sellerId?: string | null;
  merchantId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  configurationRef?: string | null;
  status: MarketplaceAccountStatus;
  priority: number;
  isDefault: boolean;
  lastTestedAt?: string | null;
  lastTestSuccess?: boolean | null;
  lastTestCorrelationId?: string | null;
  metadata?: Record<string, unknown> | null;
  version: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMarketplaceAccountPayload {
  providerKey: string;
  marketplaceKey: string;
  accountName: string;
  externalAccountId: string;
  sellerId?: string;
  merchantId?: string;
  country?: string;
  region?: string;
  currency?: string;
  locale?: string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateMarketplaceAccountPayload = Partial<Omit<CreateMarketplaceAccountPayload, 'providerKey' | 'marketplaceKey' | 'externalAccountId'>>;

export interface MarketplaceAccountFilterParams extends PaginationParams {
  providerKey?: string;
  marketplaceKey?: string;
  country?: string;
  status?: MarketplaceAccountStatus;
  isDefault?: boolean;
  search?: string;
}

export interface MarketplaceAccountListResult {
  items: MarketplaceAccount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketplaceAccountHistoryEntry {
  id: string;
  accountId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Multi-Channel (`multi-channel` module) ───────────────────
export type ChannelType = 'MARKETPLACE' | 'D2C_STORE' | 'B2B_PORTAL' | 'RETAIL_POS' | 'SOCIAL_COMMERCE' | 'CUSTOM';
export type ChannelStatus = 'REGISTERED' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';

/** The full multi-channel-module entity — distinct from the lighter business/brand/channel-switcher `Channel` type above, which represents the same underlying concept via a simpler read-only DTO used for workspace context switching. */
export interface ChannelRegistration {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  brandId?: string | null;
  channelType: ChannelType;
  channelKey: string;
  providerKey?: string | null;
  marketplaceAccountId?: string | null;
  externalAccountRef?: string | null;
  name: string;
  status: ChannelStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  capabilities: string[];
  routingRules: Record<string, unknown>;
  rateLimitConfig?: Record<string, unknown> | null;
  retryConfig?: Record<string, unknown> | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterChannelPayload {
  workspaceId: string;
  organizationId?: string;
  businessId?: string;
  brandId?: string;
  channelType: ChannelType;
  channelKey: string;
  providerKey?: string;
  marketplaceAccountId?: string;
  externalAccountRef?: string;
  name: string;
  capabilities?: string[];
  priority?: number;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateChannelPayload {
  name?: string;
  providerKey?: string;
  marketplaceAccountId?: string;
  externalAccountRef?: string;
  businessId?: string;
  brandId?: string;
  capabilities?: string[];
  priority?: number;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface ChannelFilterParams extends PaginationParams {
  workspaceId?: string;
  businessId?: string;
  brandId?: string;
  channelType?: ChannelType;
  status?: ChannelStatus;
  search?: string;
}

export interface ChannelListResult {
  items: ChannelRegistration[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChannelHistoryEntry {
  id: string;
  channelId: string;
  version: number;
  status: ChannelStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface ChannelProductMapping {
  id: string;
  channelId: string;
  internalProductId: string;
  externalSku?: string | null;
  externalProductId?: string | null;
  externalUrl?: string | null;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelProductMappingPayload {
  internalProductId: string;
  externalSku?: string;
  externalProductId?: string;
  externalUrl?: string;
  metadata?: Record<string, unknown>;
}

// ── Listing Approval (`listing-approval` module) ─────────────
export type ApprovalStatus =
  | 'PENDING_APPROVAL'
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISION_REQUIRED'
  | 'READY_TO_PUBLISH';

export interface ApprovalCheckResult {
  area: string;
  passed: boolean;
  notes?: string;
}

export interface ListingApproval {
  id: string;
  workspaceId: string;
  listingId: string;
  catalogProductId: string;
  status: ApprovalStatus;
  version: number;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  revisionNotes?: string | null;
  checkResults?: ApprovalCheckResult[] | null;
  validationSummary?: Record<string, unknown> | null;
  approvalRules?: Record<string, unknown>[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingApprovalPayload {
  listingId: string;
  catalogProductId: string;
  approvalComment?: string;
}

export interface ListingApprovalFilterParams extends PaginationParams {
  status?: ApprovalStatus[];
  listingId?: string;
  catalogProductId?: string;
  reviewedBy?: string;
}

/** Listing approval list responses use the `data/totalPages` shape. */
export type ListingApprovalListResult = PaginatedResult<ListingApproval>;

export interface ListingApprovalStats {
  total: number;
  byStatus: Record<string, number>;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  revisionRequiredCount: number;
  readyToPublishCount: number;
}

export interface ListingApprovalHistoryEntry {
  id: string;
  approvalId: string;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Listing Publisher (`listing-publisher` module) ────────────
export type PublicationStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'UNPUBLISHED'
  | 'ARCHIVED';
export type SyncStatus = 'IDLE' | 'SCHEDULED' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | 'CANCELLED' | 'STUCK' | 'DELAYED' | 'UNKNOWN';

export interface ListingPublication {
  id: string;
  workspaceId: string;
  listingId: string;
  catalogProductId: string;
  marketplace: string;
  status: PublicationStatus;
  publicationVersion: number;
  marketplaceListingId?: string | null;
  marketplaceUrl?: string | null;
  trigger: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  unpublishedAt?: string | null;
  syncStatus: SyncStatus;
  lastSyncedAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublishListingPayload {
  listingId: string;
  catalogProductId: string;
  marketplace: string;
  scheduledAt?: string;
  notes?: string;
}

export interface BulkPublishItem {
  listingId: string;
  catalogProductId: string;
  marketplace: string;
  scheduledAt?: string;
}

export interface BulkPublishPayload {
  items: BulkPublishItem[];
  scheduledAt?: string;
}

export interface BulkPublishResult {
  queued: number;
  skipped: number;
  errors: { listingId: string; reason: string }[];
}

export interface PublicationFilterParams extends PaginationParams {
  status?: PublicationStatus[];
  listingId?: string;
  catalogProductId?: string;
  marketplace?: string;
  syncStatus?: SyncStatus;
}

/** Publication list responses use the `data/totalPages` shape. */
export type PublicationListResult = PaginatedResult<ListingPublication>;

export interface PublicationStats {
  total: number;
  byStatus: Record<string, number>;
  byMarketplace: Record<string, number>;
  bySyncStatus: Record<string, number>;
  publishedCount: number;
  failedCount: number;
  pendingCount: number;
}

export interface PublicationHistoryEntry {
  id: string;
  publicationId: string;
  fromStatus: PublicationStatus;
  toStatus: PublicationStatus;
  publicationVersion: number;
  trigger: string;
  reason?: string | null;
  changedBy?: string | null;
  marketplaceListingId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

// ── Marketplace Listing Mapping (`marketplace-listing-mapping` module) — read/create visibility slice ──
export interface CategoryMapping {
  id: string;
  workspaceId: string;
  marketplaceKey: string;
  internalCategoryId: string;
  externalCategoryId: string;
  externalCategoryPath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryMappingPayload {
  marketplaceKey: string;
  internalCategoryId: string;
  externalCategoryId: string;
  externalCategoryPath?: string;
}

export interface AttributeMapping {
  id: string;
  workspaceId: string;
  marketplaceKey: string;
  internalAttributeKey: string;
  externalAttributeKey: string;
  isRequired?: boolean;
  transformRule?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappingFilterParams extends PaginationParams {
  marketplaceKey?: string;
}

// ── Marketplace Sync Monitor (`marketplace-sync-monitor` module) — sync dashboard ──
export type SyncModule = 'CATALOG' | 'INVENTORY' | 'LISTING' | 'ORDER' | 'SHIPMENT' | 'RETURN' | 'PRICING' | 'REPORT';
export type SyncIssueType = 'STUCK' | 'DELAYED' | 'REPEATEDLY_FAILING' | 'PARTIALLY_COMPLETED' | 'RATE_LIMITED' | 'QUEUE_BACKED_UP' | 'HIGH_ERROR_RATE' | 'MISSING_SCHEDULE';

export interface SyncSnapshot {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  status: SyncStatus;
  jobId?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  throughput?: number;
  errorCount: number;
  lastError?: string;
  lastErrorAt?: string;
  consecutiveFailures: number;
  lastSuccessfulSyncAt?: string;
  nextScheduledSyncAt?: string;
}

export interface SyncAggregate {
  snapshot: SyncSnapshot;
  queueHealth?: Record<string, unknown>;
  rateLimitStatus?: Record<string, unknown>;
  recentHistory: unknown[];
  activeIssues: SyncIssue[];
}

export interface SyncIssue {
  /** Present on the raw persisted record (used by `resolveIssue`) even though the backend's response DTO doesn't declare it. */
  id?: string;
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  type: SyncIssueType;
  severity: string;
  message: string;
  detectedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncMetrics {
  workspaceId: string;
  module?: SyncModule;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalItemsProcessed: number;
  totalItemsFailed: number;
  overallSuccessRate: number;
  avgDuration?: number;
  avgThroughput?: number;
  activeIssuesCount: number;
  unresolvedFailuresCount: number;
  stuckJobsCount: number;
  delayedJobsCount: number;
  consecutiveFailuresCount: number;
}

export interface RetrySyncPayload {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId?: string;
  resumeFromCursor?: boolean;
  resetErrors?: boolean;
}

export interface CancelSyncPayload {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  reason?: string;
  graceful?: boolean;
}

export interface SyncActionResult {
  success: boolean;
  message: string;
  jobId?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncListFilterParams {
  workspaceId: string;
  module?: SyncModule;
  provider?: string;
  accountId?: string;
  status?: SyncStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface SyncHistoryEntry {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  itemsProcessed: number;
  itemsTotal?: number;
  itemsFailed: number;
  successRate: number;
  errorSummary?: string;
  triggeredBy?: string;
}

export interface SyncItemFailure {
  workspaceId: string;
  module: SyncModule;
  provider: string;
  accountId?: string;
  jobId: string;
  itemId: string;
  externalId?: string;
  errorCode?: string;
  errorMessage: string;
  failedAt: string;
  retryCount: number;
  isResolved: boolean;
}

export interface SyncErrorSummaryEntry {
  errorCode?: string;
  errorMessage: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  affectedItems: string[];
  isRecoverable: boolean;
  suggestedAction?: string;
}

export interface SyncQueueHealthSnapshot {
  queueName: string;
  workspaceId: string;
  module: SyncModule;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  isPaused: boolean;
  isHealthy: boolean;
  avgProcessingTime?: number;
  throughput?: number;
  errorRate?: number;
  lastJobAt?: string;
}

// ── Inventory core (`inventory` module) ──────────────────────────────
export type InventoryItemStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'ARCHIVED';
export type InventoryTrackingType = 'NONE' | 'BATCH' | 'SERIAL';
export type InventoryStockStatus = 'AVAILABLE' | 'RESERVED' | 'DAMAGED' | 'LOST' | 'IN_TRANSIT' | 'BLOCKED';
export type InventoryOwnershipType = 'WORKSPACE' | 'CONSIGNMENT' | 'THIRD_PARTY_SELLER' | 'SUPPLIER' | 'CUSTOMER';
export type InventoryTransactionType = 'RECEIPT' | 'ISSUE' | 'DISPATCH' | 'RETURN' | 'TRANSFER' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE' | 'STATUS_CHANGE' | 'BATCH_CREATED' | 'SERIAL_STATUS_CHANGE' | 'EXPIRED' | 'REVERSAL';
export type InventoryTransactionStatus = 'POSTED' | 'REVERSED';

export interface InventoryItem {
  id: string;
  workspaceId: string;
  sku: string;
  skuSequence: number;
  catalogProductId?: string | null;
  name: string;
  status: InventoryItemStatus;
  trackingType: InventoryTrackingType;
  baseUom: string;
  reorderPoint: number;
  safetyStock: number;
  reorderQuantity: number;
  isExpiryTracked: boolean;
  shelfLifeDays?: number | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateInventoryItemPayload {
  sku: string;
  catalogProductId?: string;
  name: string;
  trackingType?: InventoryTrackingType;
  baseUom?: string;
  reorderPoint?: number;
  safetyStock?: number;
  reorderQuantity?: number;
  isExpiryTracked?: boolean;
  shelfLifeDays?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateInventoryItemPayload = Partial<Omit<CreateInventoryItemPayload, 'sku'>>;

export interface InventoryItemFilterParams extends PaginationParams {
  status?: InventoryItemStatus[];
  trackingType?: InventoryTrackingType;
  catalogProductId?: string;
}

export interface InventoryItemListResult {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryItemHistoryEntry {
  id: string;
  inventoryItemId: string;
  fromStatus: InventoryItemStatus;
  toStatus: InventoryItemStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface InventoryConfig {
  id: string;
  inventoryItemId: string;
  valuationMethod: string;
  allowNegativeStock: boolean;
  autoReorderEnabled: boolean;
  expiryAlertDays: number;
  requiresBatchOnReceipt: boolean;
  requiresSerialOnReceipt: boolean;
  metadata: Record<string, unknown>;
}

// ── Inventory stock & transactions ────────────────────────────────────
export interface InventoryStock {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  status: InventoryStockStatus;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity: number;
  uom: string;
}

export interface InventoryTransaction {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  ownershipType: InventoryOwnershipType;
  type: InventoryTransactionType;
  status: InventoryTransactionStatus;
  quantity: number;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  uom: string;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  reversalOfId?: string | null;
  reversedAt?: string | null;
  createdAt: string;
}

export interface OnHandSummary {
  inventoryItemId: string;
  totalQuantity: number;
  byStatus: Record<string, number>;
  byWarehouse: Record<string, number>;
}

export interface ReceiveStockPayload {
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  quantity: number;
  uom?: string;
  status?: InventoryStockStatus;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface AdjustStockPayload {
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  quantityDelta: number;
  uom?: string;
  reason: string;
}

export interface ReserveStockPayload {
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  quantity: number;
  uom?: string;
  reason?: string;
}

export interface TransferStockPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  fromLocationId?: string;
  toLocationId?: string;
  batchId?: string;
  quantity: number;
  uom?: string;
  reason?: string;
}

export interface ChangeStockStatusPayload {
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  fromStatus: InventoryStockStatus;
  toStatus: InventoryStockStatus;
  quantity: number;
  reason?: string;
}

// ── Inventory batches & serials ───────────────────────────────────────
export interface InventoryBatch {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  batchNumber: string;
  manufactureDate?: string | null;
  expiryDate?: string | null;
  receivedDate: string;
  supplierId?: string | null;
  quantity: number;
  metadata: Record<string, unknown>;
}

export interface CreateInventoryBatchPayload {
  batchNumber: string;
  manufactureDate?: string;
  expiryDate?: string;
  supplierId?: string;
  quantity: number;
}

export interface InventorySerial {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  batchId?: string | null;
  serialNumber: string;
  status: InventoryStockStatus;
  warehouseId?: string | null;
  locationId?: string | null;
  expiryDate?: string | null;
  metadata: Record<string, unknown>;
}

// ── Inventory reservations ─────────────────────────────────────────────
export type InventoryReservationStatus = 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
export type InventoryReservationSource = 'ORDER' | 'TRANSFER' | 'PICKING' | 'MARKETPLACE' | 'MANUAL';
export type InventoryReservationLineStatus = 'PLANNED' | 'ACTIVE' | 'RELEASED' | 'CANCELLED';

export interface InventoryReservationLine {
  id: string;
  reservationId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  ownershipType: InventoryOwnershipType;
  quantity: number;
  status: InventoryReservationLineStatus;
}

export interface InventoryReservation {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  source: InventoryReservationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  status: InventoryReservationStatus;
  priority: number;
  requestedQuantity: number;
  reservedQuantity: number;
  releasedQuantity: number;
  releasableQuantity?: number;
  uom: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: InventoryReservationLine[];
}

export interface CreateReservationPayload {
  inventoryItemId: string;
  source?: InventoryReservationSource;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  quantity: number;
  uom?: string;
  priority?: number;
  expiresAt?: string;
  warehouseId?: string;
  locationId?: string;
  batchId?: string;
}

export interface InventoryReservationFilterParams extends PaginationParams {
  status?: InventoryReservationStatus;
  source?: InventoryReservationSource;
  warehouseId?: string;
}

/** Reservation list responses use the `data/totalPages` shape. */
export type InventoryReservationListResult = PaginatedResult<InventoryReservation>;

// ── Inventory allocations ──────────────────────────────────────────────
export type InventoryAllocationSource = 'ORDER' | 'TRANSFER' | 'MARKETPLACE' | 'REPLENISHMENT' | 'MANUAL';
export type InventoryAllocationStrategy = 'FIFO' | 'FEFO' | 'LIFO' | 'NEAREST_WAREHOUSE' | 'LOWEST_FULFILLMENT_COST' | 'HIGHEST_AVAILABLE_STOCK' | 'PRIORITY_WAREHOUSE';
export type InventoryAllocationStatus = 'PENDING' | 'ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'SHORTAGE' | 'RELEASED' | 'CANCELLED';
export type InventoryAllocationLineStatus = 'ALLOCATED' | 'RELEASED' | 'CANCELLED';

export interface InventoryAllocationLine {
  id: string;
  allocationId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  quantity: number;
  score?: number | null;
  reason?: string | null;
  status: InventoryAllocationLineStatus;
}

export interface InventoryAllocation {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  source: InventoryAllocationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  strategy: InventoryAllocationStrategy;
  status: InventoryAllocationStatus;
  priority: number;
  requestedQuantity: number;
  allocatedQuantity: number;
  releasedQuantity: number;
  shortageQuantity?: number;
  uom: string;
  reallocationCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: InventoryAllocationLine[];
}

export interface AllocateInventoryPayload {
  inventoryItemId: string;
  source?: InventoryAllocationSource;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  quantity: number;
  uom?: string;
  strategy?: InventoryAllocationStrategy;
  priority?: number;
  warehouseIds?: string[];
}

export interface InventoryAllocationFilterParams extends PaginationParams {
  status?: InventoryAllocationStatus;
  source?: InventoryAllocationSource;
  warehouseId?: string;
}

/** Allocation list responses use the `data/totalPages` shape. */
export type InventoryAllocationListResult = PaginatedResult<InventoryAllocation>;

// ── Inventory adjustments ──────────────────────────────────────────────
export type InventoryAdjustmentType = 'INCREASE' | 'DECREASE' | 'DAMAGE' | 'LOSS' | 'EXPIRY' | 'COUNT_VARIANCE' | 'STATUS_CORRECTION';
export type InventoryAdjustmentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'CANCELLED' | 'REVERSED';

export interface InventoryAdjustment {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  type: InventoryAdjustmentType;
  status: InventoryAdjustmentStatus;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  quantity?: number | null;
  quantityDelta?: number | null;
  uom: string;
  unitCost?: number | null;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  valueBefore?: number | null;
  valueAfter?: number | null;
  reason: string;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdjustmentPayload {
  inventoryItemId: string;
  type: InventoryAdjustmentType;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  serialId?: string;
  fromStatus?: InventoryStockStatus;
  toStatus?: InventoryStockStatus;
  quantity?: number;
  quantityDelta?: number;
  uom?: string;
  unitCost?: number;
  reason: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  notes?: string;
}

export interface InventoryAdjustmentFilterParams extends PaginationParams {
  status?: InventoryAdjustmentStatus;
  type?: InventoryAdjustmentType;
  warehouseId?: string;
}

/** Adjustment list responses use the `data/totalPages` shape. */
export type InventoryAdjustmentListResult = PaginatedResult<InventoryAdjustment>;

export interface InventoryAdjustmentHistoryEntry {
  id: string;
  adjustmentId: string;
  fromStatus?: InventoryAdjustmentStatus | null;
  toStatus: InventoryAdjustmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Inventory reconciliations ──────────────────────────────────────────
export type InventoryReconciliationSourceType = 'WAREHOUSE' | 'MARKETPLACE' | 'SUPPLIER' | 'PHYSICAL_COUNT';
export type InventoryReconciliationTrigger = 'MANUAL' | 'SCHEDULED' | 'BULK' | 'SOURCE_SPECIFIC';
export type InventoryReconciliationStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type InventoryReconciliationVarianceType = 'MATCHED' | 'MISSING' | 'EXCESS' | 'DUPLICATE' | 'STALE';
export type InventoryReconciliationClassification = 'MATCHED' | 'WARNING' | 'CRITICAL' | 'UNRESOLVED';
export type InventoryReconciliationFindingStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'IGNORED' | 'RESOLVED';

export interface InventoryReconciliationRun {
  id: string;
  workspaceId: string;
  sourceType: InventoryReconciliationSourceType;
  trigger: InventoryReconciliationTrigger;
  status: InventoryReconciliationStatus;
  inventoryItemId?: string | null;
  scopeWarehouseId?: string | null;
  periodStart: string;
  periodEnd: string;
  totalLines: number;
  matchedCount: number;
  warningCount: number;
  criticalCount: number;
  unresolvedCount: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryReconciliationLine {
  id: string;
  runId: string;
  inventoryItemId: string;
  sku?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  status: InventoryStockStatus;
  systemQuantity: number;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  unitCost?: number | null;
  varianceValue?: number | null;
  varianceType: InventoryReconciliationVarianceType;
  classification: InventoryReconciliationClassification;
  findingStatus: InventoryReconciliationFindingStatus;
  adjustmentId?: string | null;
  reason?: string | null;
  notes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationLineInput {
  inventoryItemId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  serialId?: string;
  status?: InventoryStockStatus;
  countedQuantity: number;
  unitCost?: number;
}

export interface CreateReconciliationRunPayload {
  sourceType: InventoryReconciliationSourceType;
  trigger?: InventoryReconciliationTrigger;
  inventoryItemId?: string;
  scopeWarehouseId?: string;
  periodStart: string;
  periodEnd: string;
  lines: ReconciliationLineInput[];
}

export interface InventoryReconciliationFilterParams extends PaginationParams {
  status?: InventoryReconciliationStatus;
  sourceType?: InventoryReconciliationSourceType;
  scopeWarehouseId?: string;
}

/** Reconciliation run list responses use the `data/totalPages` shape. */
export type InventoryReconciliationListResult = PaginatedResult<InventoryReconciliationRun>;
export type InventoryReconciliationLineListResult = PaginatedResult<InventoryReconciliationLine>;

// ── Inventory cycle counts ─────────────────────────────────────────────
export type InventoryCycleCountType = 'FULL' | 'PARTIAL' | 'BLIND' | 'SPOT' | 'ABC';
export type InventoryCycleCountStatus = 'DRAFT' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type InventoryCycleCountLineStatus = 'PENDING' | 'COUNTED' | 'RECOUNT_REQUIRED' | 'VERIFIED';

export interface InventoryCycleCount {
  id: string;
  workspaceId: string;
  type: InventoryCycleCountType;
  status: InventoryCycleCountStatus;
  scopeWarehouseId?: string | null;
  scopeLocationId?: string | null;
  scopeInventoryItemId?: string | null;
  abcClass?: string | null;
  isBlind: boolean;
  freezeStock: boolean;
  scheduledAt?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  totalLines: number;
  countedLines: number;
  varianceLines: number;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryCycleCountLine {
  id: string;
  cycleCountId: string;
  inventoryItemId: string;
  sku?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  status: InventoryStockStatus;
  expectedQuantity?: number | null;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  lineStatus: InventoryCycleCountLineStatus;
  recountCount: number;
  countedBy?: string | null;
  countedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CycleCountLineInput {
  inventoryItemId: string;
  warehouseId: string;
  locationId?: string;
  batchId?: string;
  serialId?: string;
  status?: InventoryStockStatus;
}

export interface CreateCycleCountPayload {
  type?: InventoryCycleCountType;
  scopeWarehouseId?: string;
  scopeLocationId?: string;
  scopeInventoryItemId?: string;
  abcClass?: string;
  isBlind?: boolean;
  freezeStock?: boolean;
  scheduledAt?: string;
  lines: CycleCountLineInput[];
}

export interface InventoryCycleCountFilterParams extends PaginationParams {
  status?: InventoryCycleCountStatus[];
  type?: InventoryCycleCountType;
  scopeWarehouseId?: string;
}

/** Cycle count list responses use the `data/totalPages` shape. */
export type InventoryCycleCountListResult = PaginatedResult<InventoryCycleCount>;

// ── Inventory movements ────────────────────────────────────────────────
export type InventoryMovementStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'CANCELLED' | 'REVERSED';

export interface InventoryMovement {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  warehouseId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus: InventoryStockStatus;
  toStatus: InventoryStockStatus;
  quantity: number;
  uom: string;
  status: InventoryMovementStatus;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  executedBy?: string | null;
  executedAt?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMovementPayload {
  inventoryItemId: string;
  warehouseId: string;
  fromLocationId?: string;
  toLocationId?: string;
  batchId?: string;
  serialId?: string;
  fromStatus: InventoryStockStatus;
  toStatus: InventoryStockStatus;
  quantity: number;
  uom?: string;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface InventoryMovementFilterParams extends PaginationParams {
  status?: InventoryMovementStatus;
  warehouseId?: string;
}

/** Movement list responses use the `data/totalPages` shape. */
export type InventoryMovementListResult = PaginatedResult<InventoryMovement>;

// ── Inventory transfers ────────────────────────────────────────────────
export type InventoryTransferStatus = 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'CANCELLED' | 'REVERSED';
export type InventoryTransferLineStatus = 'PENDING' | 'RESERVED' | 'DISPATCHED' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'CANCELLED';

export interface InventoryTransferLine {
  id: string;
  transferId: string;
  inventoryItemId: string;
  sku?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  requestedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  uom: string;
  status: InventoryTransferLineStatus;
  sourceLocationId?: string | null;
  destinationLocationId?: string | null;
}

export interface InventoryTransfer {
  id: string;
  workspaceId: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: InventoryTransferStatus;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  shipmentReference?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  dispatchedBy?: string | null;
  dispatchedAt?: string | null;
  receivedBy?: string | null;
  receivedAt?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: InventoryTransferLine[];
}

export interface CreateTransferLineInput {
  inventoryItemId: string;
  batchId?: string;
  serialId?: string;
  quantity: number;
  uom?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
}

export interface CreateInventoryTransferPayload {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  lines: CreateTransferLineInput[];
  reason: string;
  shipmentReference?: string;
  notes?: string;
}

export interface ReceiveTransferLineInput {
  lineId: string;
  receivedQuantity: number;
  damagedQuantity?: number;
  destinationLocationId?: string;
  notes?: string;
}

export interface InventoryTransferFilterParams extends PaginationParams {
  status?: InventoryTransferStatus;
  sourceWarehouseId?: string;
  destinationWarehouseId?: string;
}

/** Transfer list responses use the `data/totalPages` shape. */
export type InventoryTransferListResult = PaginatedResult<InventoryTransfer>;
export interface InventoryTransferHistoryEntry {
  id: string;
  transferId: string;
  fromStatus?: InventoryTransferStatus | null;
  toStatus: InventoryTransferStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Warehouse (`warehouse` module) — full entity, distinct from the read-only WarehouseSummary above ──
export type WarehouseType = 'OWN' | 'RENTED' | 'THIRD_PARTY' | 'MARKETPLACE' | 'VIRTUAL';
export type WarehouseFullStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';

export interface Warehouse {
  id: string;
  workspaceId: string;
  code: string;
  name: string;
  type: WarehouseType;
  status: WarehouseFullStatus;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  postalCode?: string | null;
  timezone: string;
  currency?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  capacity?: number | null;
  isDefault: boolean;
  isPriority: boolean;
  isFallback: boolean;
  marketplaceAccountId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateWarehousePayload {
  code: string;
  name: string;
  type: WarehouseType;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  region?: string;
  postalCode?: string;
  timezone?: string;
  currency?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  capacity?: number;
}

export type UpdateWarehousePayload = Partial<Omit<CreateWarehousePayload, 'code'>>;

export interface WarehouseFilterParams extends PaginationParams {
  status?: WarehouseFullStatus;
  type?: WarehouseType;
  country?: string;
  search?: string;
}

export interface WarehouseFullListResult {
  data: Warehouse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WarehouseHistoryEntry {
  id: string;
  warehouseId: string;
  fromStatus: WarehouseFullStatus | null;
  toStatus: WarehouseFullStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Warehouse zones, locations, bins, capacity ─────────────────────────
export type WarehouseLocationType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'PACKING' | 'DISPATCH' | 'RETURNS' | 'QUARANTINE' | 'DAMAGED' | 'VIRTUAL' | 'ZONE' | 'AISLE' | 'RACK' | 'SHELF' | 'BIN' | 'STAGING' | 'DOCK';
export type WarehouseLocationStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
export type BinType = 'STORAGE' | 'PICKING' | 'RECEIVING' | 'QUARANTINE' | 'DAMAGED' | 'RETURNS' | 'VIRTUAL';
export type BinStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
export type BinMode = 'FIXED' | 'SHARED' | 'DYNAMIC';
export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'PACKING' | 'DISPATCH' | 'RETURNS' | 'QUARANTINE' | 'DAMAGED' | 'COLD_STORAGE' | 'VIRTUAL';
export type ZoneStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ARCHIVED';
export type CapacityStatus = 'AVAILABLE' | 'NEAR_CAPACITY' | 'CRITICAL' | 'EXCEEDED';

export interface WarehouseZone {
  id: string;
  workspaceId: string;
  warehouseId: string;
  code: string;
  name?: string | null;
  type: ZoneType;
  status: ZoneStatus;
  priority: number;
  capacity?: number | null;
  occupiedCapacity: number;
  reservedCapacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseZonePayload {
  code: string;
  name?: string;
  type: ZoneType;
  priority?: number;
  capacity?: number;
}

export interface WarehouseLocation {
  id: string;
  workspaceId: string;
  warehouseId: string;
  parentLocationId?: string | null;
  code: string;
  name?: string | null;
  type: WarehouseLocationType;
  status: WarehouseLocationStatus;
  zone?: string | null;
  barcode?: string | null;
  capacity?: number | null;
  occupiedCapacity?: number;
  reservedCapacity?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseLocationPayload {
  code: string;
  name?: string;
  type: WarehouseLocationType;
  parentLocationId?: string;
  zone?: string;
  capacity?: number;
}

export interface WarehouseBin {
  id: string;
  workspaceId: string;
  warehouseId: string;
  locationId?: string | null;
  code: string;
  name?: string | null;
  type: BinType;
  status: BinStatus;
  mode: BinMode;
  capacity?: number | null;
  occupiedCapacity: number;
  reservedCapacity: number;
  allowBatch: boolean;
  allowSerial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseBinPayload {
  code: string;
  name?: string;
  type: BinType;
  mode?: BinMode;
  locationId?: string;
  capacity?: number;
}

export interface CapacitySnapshot {
  total: number | null;
  occupied: number;
  reserved: number;
  available: number;
  blocked: number;
  utilizationPercent: number;
  status: CapacityStatus;
}

// ── Putaway (`putaway` module) ─────────────────────────────────────────
export type PutawayStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type PutawayStrategy = 'FIXED_BIN' | 'NEAREST_AVAILABLE' | 'BEST_FIT_CAPACITY' | 'PRODUCT_CATEGORY' | 'STORAGE_CONDITION' | 'FIFO' | 'FEFO' | 'BATCH_LOT' | 'SERIAL_NUMBER' | 'PRIORITY_ZONE';

export interface PutawayTaskLine {
  id: string;
  taskId: string;
  lineNumber: number;
  status: PutawayStatus;
  sku?: string | null;
  productName?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  sourceLocationId?: string | null;
  recommendedZoneId?: string | null;
  recommendedLocationId?: string | null;
  recommendedBinId?: string | null;
  destinationZoneId?: string | null;
  destinationLocationId?: string | null;
  destinationBinId?: string | null;
  quantity: number;
  putawayQuantity: number;
  uom: string;
}

export interface PutawayTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PutawayStatus;
  strategy: PutawayStrategy;
  warehouseId: string;
  receivingId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalQuantity: number;
  putawayQuantity: number;
  priority: number;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: PutawayTaskLine[];
}

export interface CreatePutawayPayload {
  warehouseId: string;
  receivingId?: string;
  strategy?: PutawayStrategy;
  priority?: number;
  notes?: string;
}

export interface PutawayFilterParams extends PaginationParams {
  status?: PutawayStatus[];
  warehouseId?: string;
  assignedTo?: string;
}

export type PutawayListResult = PaginatedResult<PutawayTask>;

// ── Picking (`picking` module) ─────────────────────────────────────────
export type PickingStatus = 'PENDING' | 'ASSIGNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type PickingType = 'SINGLE' | 'BATCH' | 'WAVE' | 'ZONE' | 'PRIORITY';
export type PickingStrategy = 'FIFO' | 'FEFO' | 'ALLOCATION' | 'WAREHOUSE_PRIORITY';
export type PickingExceptionType = 'MISSING' | 'DAMAGED' | 'EXPIRED' | 'MISMATCHED' | 'SHORT' | 'OTHER';

export interface PickingTaskLine {
  id: string;
  taskId: string;
  lineNumber: number;
  status: PickingStatus;
  sku?: string | null;
  productName?: string | null;
  batchNumber?: string | null;
  serialNumber?: string | null;
  sourceZoneId?: string | null;
  sourceLocationId?: string | null;
  sourceBinId?: string | null;
  requestedQuantity: number;
  pickedQuantity: number;
  shortQuantity: number;
  uom: string;
}

export interface PickingException {
  id: string;
  taskId: string;
  lineId?: string | null;
  exceptionType: PickingExceptionType;
  description: string;
  quantity?: number | null;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface PickingTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PickingStatus;
  pickingType: PickingType;
  strategy: PickingStrategy;
  warehouseId: string;
  orderId?: string | null;
  transferId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  releasedAt?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  totalQuantity: number;
  pickedQuantity: number;
  stagingLocationId?: string | null;
  priority: number;
  waveId?: string | null;
  batchId?: string | null;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: PickingTaskLine[];
}

export interface CreatePickingPayload {
  warehouseId: string;
  orderId?: string;
  transferId?: string;
  pickingType?: PickingType;
  strategy?: PickingStrategy;
  priority?: number;
  notes?: string;
}

export interface PickingFilterParams extends PaginationParams {
  status?: PickingStatus[];
  pickingType?: PickingType;
  warehouseId?: string;
  assignedTo?: string;
}

export type PickingListResult = PaginatedResult<PickingTask>;

export interface RecordExceptionPayload {
  lineId?: string;
  exceptionType: string;
  description: string;
  quantity?: number;
}

// ── Packing (`packing` module) ─────────────────────────────────────────
export type PackingStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'REOPENED';
export type PackingType = 'SINGLE' | 'BATCH' | 'MULTI_PACKAGE';
export type PackageType = 'BOX' | 'ENVELOPE' | 'TUBE' | 'PALLET' | 'CRATE' | 'POLYBAG' | 'CUSTOM';
export type PackingExceptionType = 'MISSING' | 'DAMAGED' | 'EXCESS' | 'MISMATCHED' | 'PACKAGE_INCOMPATIBLE' | 'OTHER';

export interface PackingTaskLine {
  id: string;
  taskId: string;
  lineNumber: number;
  status: PackingStatus;
  sku?: string | null;
  productName?: string | null;
  pickedQuantity: number;
  packedQuantity: number;
  uom: string;
  packageId?: string | null;
}

export interface PackingTaskPackage {
  id: string;
  taskId: string;
  packageNumber: string;
  packageId: string;
  packageType: PackageType;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  weight?: number | null;
  weightUnit: string;
  labelUrl?: string | null;
  packingSlipUrl?: string | null;
  shipmentReady: boolean;
  createdAt: string;
}

export interface PackingException {
  id: string;
  taskId: string;
  lineId?: string | null;
  packageId?: string | null;
  exceptionType: PackingExceptionType;
  description: string;
  resolution?: string | null;
  createdAt: string;
}

export interface PackingTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: PackingStatus;
  packingType: PackingType;
  warehouseId: string;
  pickingTaskId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  startedAt?: string | null;
  pausedAt?: string | null;
  completedAt?: string | null;
  totalQuantity: number;
  packedQuantity: number;
  priority: number;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: PackingTaskLine[];
}

export interface CreatePackingPayload {
  warehouseId: string;
  pickingTaskId?: string;
  orderId?: string;
  packingType?: PackingType;
  priority?: number;
  notes?: string;
}

export interface CreatePackagePayload {
  packageType: PackageType;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  weight?: number;
  weightUnit?: string;
}

export interface PackingFilterParams extends PaginationParams {
  status?: PackingStatus[];
  warehouseId?: string;
  assignedTo?: string;
}

export type PackingListResult = PaginatedResult<PackingTask>;

// ── Dispatch (`dispatch` module) ───────────────────────────────────────
export type DispatchStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REOPENED';
export type DispatchType = 'SINGLE' | 'BATCH' | 'WAVE' | 'CARRIER_WISE';
export type DispatchExceptionType = 'MISSING' | 'DAMAGED' | 'CANCELLED' | 'MISMATCHED' | 'OTHER';

export interface DispatchTaskPackage {
  id: string;
  taskId: string;
  packageId: string;
  trackingNumber?: string | null;
  weight?: number | null;
  weightUnit: string;
  dispatched: boolean;
  dispatchedAt?: string | null;
}

export interface DispatchException {
  id: string;
  taskId: string;
  packageId?: string | null;
  exceptionType: DispatchExceptionType;
  description: string;
  resolution?: string | null;
  createdAt: string;
}

export interface DispatchTask {
  id: string;
  workspaceId: string;
  taskNumber: string;
  taskSequence: number;
  status: DispatchStatus;
  dispatchType: DispatchType;
  warehouseId: string;
  packingTaskId?: string | null;
  orderId?: string | null;
  shipmentId?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalPackages: number;
  dispatchedPackages: number;
  carrierId?: string | null;
  carrierName?: string | null;
  serviceType?: string | null;
  manifestId?: string | null;
  manifestUrl?: string | null;
  pickupReference?: string | null;
  dispatchReference?: string | null;
  dispatchNoteUrl?: string | null;
  handoverUrl?: string | null;
  priority: number;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDispatchPayload {
  warehouseId: string;
  packingTaskId?: string;
  orderId?: string;
  dispatchType?: DispatchType;
  carrierName?: string;
  serviceType?: string;
  priority?: number;
  notes?: string;
}

export interface DispatchFilterParams extends PaginationParams {
  status?: DispatchStatus[];
  warehouseId?: string;
  carrierId?: string;
  assignedTo?: string;
}

export type DispatchListResult = PaginatedResult<DispatchTask>;

// ── Barcode & Labels (`barcode` module) ────────────────────────────────
export type BarcodeType = 'UPC' | 'EAN' | 'GTIN' | 'CODE_128' | 'CODE_39' | 'QR' | 'CUSTOM';
export type BarcodeEntityType = 'SKU' | 'PRODUCT' | 'VARIANT' | 'BATCH' | 'SERIAL' | 'WAREHOUSE' | 'ZONE' | 'LOCATION' | 'BIN' | 'PACKAGE' | 'SHIPMENT';
export type BarcodeStatus = 'ACTIVE' | 'INACTIVE' | 'REPLACED' | 'DEACTIVATED';
export type LabelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'CUSTOM';
export type ScanResultStatus = 'SUCCESS' | 'NOT_FOUND' | 'INACTIVE' | 'INVALID';

export interface Barcode {
  id: string;
  workspaceId: string;
  value: string;
  type: BarcodeType;
  entityType: BarcodeEntityType;
  entityId: string;
  status: BarcodeStatus;
  version: number;
  replacedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateBarcodePayload {
  type: BarcodeType;
  entityType: BarcodeEntityType;
  entityId: string;
}

export interface ScanBarcodePayload {
  value: string;
  deviceId?: string;
  locationContext?: string;
}

export interface ScanResult {
  result: ScanResultStatus;
  barcode?: Barcode | null;
  message?: string;
}

export interface BarcodeFilterParams extends PaginationParams {
  entityType?: BarcodeEntityType;
  entityId?: string;
  status?: BarcodeStatus;
}

export interface BarcodeListResult {
  items: Barcode[];
  total: number;
  page: number;
  limit: number;
}

export interface LabelTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  entityType: BarcodeEntityType;
  size: LabelSize;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelTemplatePayload {
  name: string;
  description?: string;
  entityType: BarcodeEntityType;
  size: LabelSize;
  isDefault?: boolean;
}

export interface PrintLabelPayload {
  barcodeId: string;
  templateId?: string;
  labelSize?: LabelSize;
  quantity?: number;
}

// ── FBA Shipments (`fba-shipment` module) ──────────────────────────────
export type FBAShipmentStatus = 'DRAFT' | 'PLANNED' | 'APPROVED' | 'PREPARING' | 'DISPATCHED' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'CHECKED_IN' | 'RECEIVING' | 'RECEIVED' | 'CLOSED' | 'PROBLEM' | 'CANCELLED';
export type FBAShipmentType = 'SINGLE_DESTINATION' | 'MULTI_DESTINATION';
export type FBAShipmentPrepType = 'LABELING' | 'POLY_BAGGING' | 'BUBBLE_WRAP' | 'TAPING' | 'BLACK_SHRINK_WRAP' | 'HANG_GARMENT' | 'NO_PREP' | 'OTHER';
export type FBAReceivingDiscrepancyType = 'SHORTAGE' | 'EXCESS' | 'DAMAGED' | 'LOST' | 'QUANTITY_MISMATCH' | 'PRODUCT_MISMATCH' | 'OTHER';

export interface FBAShipment {
  id: string;
  workspaceId: string;
  shipmentNumber: string;
  shipmentSequence: number;
  status: FBAShipmentStatus;
  shipmentType: FBAShipmentType;
  marketplaceAccountId: string;
  warehouseId: string;
  externalShipmentId?: string | null;
  externalShipmentName?: string | null;
  destinationFCId?: string | null;
  destinationFCName?: string | null;
  carrierName?: string | null;
  serviceType?: string | null;
  isCasePacked: boolean;
  isPartial: boolean;
  totalUnits: number;
  shippedUnits: number;
  receivedUnits: number;
  totalBoxes: number;
  shippedBoxes: number;
  plannedAt?: string | null;
  approvedAt?: string | null;
  preparedAt?: string | null;
  dispatchedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  receivedAt?: string | null;
  closedAt?: string | null;
  priority: number;
  notes?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFBAShipmentPayload {
  marketplaceAccountId: string;
  warehouseId: string;
  shipmentType?: FBAShipmentType;
  destinationFCId?: string;
  notes?: string;
}

export interface FBAShipmentItem {
  id: string;
  shipmentId: string;
  lineNumber: number;
  inventoryItemId: string;
  sku: string;
  fnsku?: string | null;
  asin?: string | null;
  productName?: string | null;
  prepType?: FBAShipmentPrepType | null;
  prepRequired: boolean;
  labelRequired: boolean;
  requestedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  condition: string;
}

export interface FBAShipmentBox {
  id: string;
  shipmentId: string;
  boxNumber: string;
  boxSequence: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimensionUnit: string;
  weight?: number | null;
  weightUnit: string;
  totalUnits: number;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  shipped: boolean;
}

export interface FBAReceivingDiscrepancy {
  id: string;
  shipmentId: string;
  itemId?: string | null;
  discrepancyType: FBAReceivingDiscrepancyType;
  sku?: string | null;
  expectedQuantity?: number | null;
  shippedQuantity?: number | null;
  receivedQuantity?: number | null;
  varianceQuantity?: number | null;
  description: string;
  reconciled: boolean;
  reconciledAt?: string | null;
  createdAt: string;
}

export interface FBAShipmentFilterParams extends PaginationParams {
  workspaceId: string;
  status?: FBAShipmentStatus[];
  marketplaceAccountId?: string;
  warehouseId?: string;
}

export interface FBAShipmentListResult {
  items: FBAShipment[];
  total: number;
  page: number;
  limit: number;
}

// ── Pricing (`pricing` module) ──────────────────────────────────────────
export type PricingStrategy = 'FIXED' | 'MARGIN_BASED' | 'ROI_BASED' | 'COMPETITIVE' | 'RULE_BASED' | 'COST_PLUS' | 'MARKETPLACE_SPECIFIC' | 'REGIONAL';
export type PricingStatus = 'DRAFT' | 'CALCULATING' | 'CALCULATED' | 'APPROVED' | 'ACTIVE' | 'ARCHIVED' | 'FAILED';

export interface PricingFeeComponents {
  commissionPct?: number | null;
  fulfilmentFeeFlat?: number | null;
  shippingFeeFlat?: number | null;
  paymentProcessingPct?: number | null;
  packagingCostFlat?: number | null;
  advertisingCostPct?: number | null;
  taxPct?: number | null;
  promotionalDiscount?: number | null;
  marketplacePriceAdjustmentPct?: number | null;
  regionalPriceAdjustmentPct?: number | null;
  currencyConversionRate?: number | null;
}

export interface PricingThresholds {
  targetMarginPct?: number | null;
  targetRoi?: number | null;
  minProfitFlat?: number | null;
  minMarginPct?: number | null;
}

export interface PricingConfig {
  id: string;
  workspaceId: string;
  marketplaceKey: string;
  country: string;
  currency: string;
  strategy: PricingStrategy;
  isDefault: boolean;
  isActive: boolean;
  feeComponents: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  rules?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingConfigPayload {
  marketplaceKey: string;
  country?: string;
  currency?: string;
  strategy?: PricingStrategy;
  isDefault?: boolean;
  commissionPct?: number;
  fulfilmentFeeFlat?: number;
  shippingFeeFlat?: number;
  paymentProcessingPct?: number;
  packagingCostFlat?: number;
  advertisingCostPct?: number;
  taxPct?: number;
  targetMarginPct?: number;
  targetRoi?: number;
  minProfitFlat?: number;
  minMarginPct?: number;
  marketplacePriceAdjustmentPct?: number;
  regionalPriceAdjustmentPct?: number;
  currencyConversionRate?: number;
  rules?: Record<string, unknown>;
}

export type UpdatePricingConfigPayload = Partial<CreatePricingConfigPayload>;

export interface PricingConfigFilterParams extends PaginationParams {
  marketplaceKey?: string;
  country?: string;
  isActive?: boolean;
  strategy?: PricingStrategy;
}

export interface PricingRecord {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  configId?: string | null;
  marketplaceKey: string;
  country: string;
  currency: string;
  strategy: PricingStrategy;
  status: PricingStatus;
  version: number;
  baseCost?: number | null;
  landedCost?: number | null;
  procurementCost?: number | null;
  totalCost?: number | null;
  suggestedSellingPrice?: number | null;
  marketplaceSellingPrice?: number | null;
  compareAtPrice?: number | null;
  estimatedProfit?: number | null;
  estimatedMarginPct?: number | null;
  estimatedRoi?: number | null;
  manualOverridePrice?: number | null;
  scheduledPrice?: number | null;
  scheduledAt?: string | null;
  isValid: boolean;
  validationErrors?: string[] | null;
  calculationMeta?: Record<string, unknown> | null;
  errorMessage?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRecordFilterParams extends PaginationParams {
  catalogProductId?: string;
  marketplaceKey?: string;
  country?: string;
  status?: PricingStatus[];
  strategy?: PricingStrategy;
}

export type PricingRecordListResult = PaginatedResult<PricingRecord>;

export interface PricingRecordHistoryEntry {
  id: string;
  pricingRecordId: string;
  version: number;
  status: PricingStatus;
  snapshot: Record<string, unknown>;
  changedBy?: string | null;
  createdAt: string;
}

export interface CalculatePricingPayload {
  catalogProductId: string;
  marketplaceKey: string;
  country?: string;
  currency?: string;
  strategy?: PricingStrategy;
  baseCost?: number;
  landedCost?: number;
  procurementCost?: number;
  feeOverrides?: Record<string, number>;
  manualOverridePrice?: number;
  competitorPrice?: number;
  scheduledPrice?: number;
  scheduledAt?: string;
}

export interface SimulatePricingPayload {
  baseCost: number;
  landedCost?: number;
  strategy: PricingStrategy;
  marketplaceKey: string;
  country?: string;
  feeOverrides?: Record<string, number>;
  thresholdOverrides?: Record<string, number>;
}

export interface PricingCalculationDetail {
  component: string;
  inputValue: number | null;
  computedAmount: number;
  note?: string;
}

export interface PricingCalculationResult {
  pricingRecordId?: string;
  totalCost: number;
  suggestedSellingPrice: number;
  marketplaceSellingPrice: number;
  compareAtPrice?: number | null;
  estimatedProfit: number;
  estimatedMarginPct: number;
  estimatedRoi: number;
  breakdown: PricingCalculationDetail[];
  warnings: string[];
  isValid: boolean;
  validationErrors: string[];
}

export interface PricingComparisonResult {
  comparisons: Record<string, unknown>[];
  bestValue?: Record<string, unknown>;
}

// ── Marketplace Pricing Synchronization (`marketplace-pricing-sync` module) ──
export type PriceSyncDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export type PriceSyncMode = 'FULL' | 'INCREMENTAL' | 'MANUAL';
export type PriceSyncJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PARTIAL';
export type PriceSyncItemType = 'ALL' | 'BASE' | 'SALE' | 'LIST' | 'PROMOTION' | 'SCHEDULED';
export type PriceConflictResolutionStrategy = 'MARKETPLACE_WINS' | 'ATLAS_WINS' | 'NEWEST_WINS' | 'HIGHEST_PRICE_WINS' | 'LOWEST_PRICE_WINS' | 'SKIP' | 'FLAG';
export type PriceSyncItemStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'CONFLICT';

export interface PriceSyncPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PriceSyncJob {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: PriceSyncDirection;
  mode: PriceSyncMode;
  status: PriceSyncJobStatus;
  itemType: PriceSyncItemType;
  startedAt?: string | null;
  completedAt?: string | null;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  conflictCount: number;
  cursor?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartPriceSyncPayload {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: PriceSyncDirection;
  mode: PriceSyncMode;
  itemType: PriceSyncItemType;
  conflictStrategy: PriceConflictResolutionStrategy;
  cursor?: string;
  batchSize?: number;
  metadata?: Record<string, unknown>;
}

export interface RetryFailedPriceItemsPayload {
  workspaceId: string;
  originalJobId: string;
  metadata?: Record<string, unknown>;
}

export interface PriceSyncJobFilterParams extends PaginationParams {
  workspaceId?: string;
  accountId?: string;
  status?: PriceSyncJobStatus;
  direction?: PriceSyncDirection;
  mode?: PriceSyncMode;
}

export interface PriceSyncItemResult {
  id: string;
  jobId: string;
  workspaceId: string;
  externalPriceId: string;
  sku?: string | null;
  status: PriceSyncItemStatus;
  operation?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceSyncItemResultFilterParams {
  status?: PriceSyncItemStatus;
  page?: number;
  limit?: number;
}

export interface PriceExternalRef {
  id: string;
  workspaceId: string;
  accountId: string;
  externalPriceId: string;
  externalOfferId?: string | null;
  atlasListingId?: string | null;
  atlasPriceId?: string | null;
  sku?: string | null;
  variantId?: string | null;
  marketplaceId?: string | null;
  countryCode?: string | null;
  lastSyncedAt: string;
  checksum?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PriceExternalRefFilterParams {
  sku?: string;
  marketplaceId?: string;
  page?: number;
  limit?: number;
}

export interface PriceConflict {
  id: string;
  workspaceId: string;
  accountId: string;
  jobId: string;
  externalPriceId: string;
  sku?: string | null;
  conflictType: string;
  marketplaceData: Record<string, unknown>;
  atlasData: Record<string, unknown>;
  isResolved: boolean;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PriceConflictFilterParams {
  accountId?: string;
  jobId?: string;
  isResolved?: boolean;
  page?: number;
  limit?: number;
}

export interface PriceSyncSchedule {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: PriceSyncDirection;
  mode: PriceSyncMode;
  itemType: PriceSyncItemType;
  conflictStrategy: PriceConflictResolutionStrategy;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceSyncSchedulePayload {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  direction: PriceSyncDirection;
  mode: PriceSyncMode;
  itemType: PriceSyncItemType;
  conflictStrategy: PriceConflictResolutionStrategy;
  cronExpression: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdatePriceSyncSchedulePayload = Partial<Omit<CreatePriceSyncSchedulePayload, 'workspaceId' | 'accountId' | 'providerKey' | 'marketplaceKey'>>;

export interface PriceSyncMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  totalItemsProcessed: number;
  totalConflicts: number;
  unresolvedConflicts: number;
}

// ── Sales Analytics (`sales-analytics` module) ──────────────────────────
export type SalesMetricType = 'revenue' | 'gross_sales' | 'net_sales' | 'units_sold' | 'order_count' | 'average_order_value' | 'discount_amount' | 'tax_amount' | 'shipping_amount' | 'refund_amount' | 'cancellation_amount' | 'return_amount' | 'fee_amount';
export type SalesTrendPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type SalesBreakdownDimension = 'product' | 'sku' | 'variant' | 'category' | 'brand' | 'marketplace' | 'provider' | 'account' | 'country' | 'region' | 'currency' | 'customer_type';
export type SalesCustomerType = 'new' | 'repeat' | 'unknown';
export type SalesComparisonType = 'previous_period' | 'same_period_last_year' | 'custom_period' | 'target';
export type ProductPerformanceCategory = 'top_performing' | 'low_performing' | 'declining' | 'growing' | 'stable';

export interface SalesAnalyticsFilterParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  period?: SalesTrendPeriod;
  marketplaceIds?: string[];
  accountIds?: string[];
  providerKeys?: string[];
  productIds?: string[];
  skus?: string[];
  categories?: string[];
  brands?: string[];
  countries?: string[];
  regions?: string[];
  currency?: string;
  customerType?: SalesCustomerType;
  orderStatuses?: string[];
}

export interface SalesSummary {
  workspaceId: string;
  period: SalesTrendPeriod;
  startDate: string;
  endDate: string;
  revenue: number;
  grossSales: number;
  netSales: number;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  refundAmount: number;
  cancellationAmount: number;
  returnAmount: number;
  feeAmount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface SalesTrendPoint {
  workspaceId: string;
  period: SalesTrendPeriod;
  periodStart: string;
  periodEnd: string;
  metricType: SalesMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
}

export interface SalesBreakdownRow {
  workspaceId: string;
  dimension: SalesBreakdownDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: SalesTrendPeriod;
  startDate: string;
  endDate: string;
  revenue: number;
  grossSales: number;
  netSales: number;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
  sharePercent?: number;
  rank?: number;
  currency: string;
}

interface SalesPeriodSnapshot {
  startDate: string;
  endDate: string;
  revenue: number;
  grossSales: number;
  netSales: number;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
}

export interface SalesComparison {
  workspaceId: string;
  comparisonType: SalesComparisonType;
  currentPeriod: SalesPeriodSnapshot;
  comparisonPeriod: SalesPeriodSnapshot;
  variance: {
    revenueAmount: number;
    revenuePercent: number;
    grossSalesAmount: number;
    grossSalesPercent: number;
    netSalesAmount: number;
    netSalesPercent: number;
    unitsSoldAmount: number;
    unitsSoldPercent: number;
    orderCountAmount: number;
    orderCountPercent: number;
    aovAmount: number;
    aovPercent: number;
  };
  currency: string;
}

export interface ProductPerformanceRow {
  workspaceId: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  brand?: string;
  performanceCategory: ProductPerformanceCategory;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  averagePrice: number;
  revenueShare: number;
  growthPercent?: number;
  rank?: number;
  currency: string;
}

export interface SalesTarget {
  id: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: SalesMetricType;
  targetValue: number;
  period: SalesTrendPeriod;
  startDate: string;
  endDate: string;
  dimensions?: Record<string, unknown>;
  currency?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesTargetPayload {
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: SalesMetricType;
  targetValue: number;
  period: SalesTrendPeriod;
  startDate: string;
  endDate: string;
  dimensions?: Record<string, unknown>;
  currency?: string;
  createdBy: string;
}

export interface SalesTargetPerformance {
  targetId: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: SalesMetricType;
  targetValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  achievementPercent: number;
  period: SalesTrendPeriod;
  startDate: string;
  endDate: string;
  currency?: string;
}

export interface SalesSavedView {
  id: string;
  workspaceId: string;
  viewKey: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  dimensions: SalesBreakdownDimension[];
  metrics: SalesMetricType[];
  period: SalesTrendPeriod;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesSavedViewPayload {
  workspaceId: string;
  viewKey: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  dimensions: SalesBreakdownDimension[];
  metrics: SalesMetricType[];
  period: SalesTrendPeriod;
  isDefault?: boolean;
  createdBy: string;
}

export interface SalesDrillDownParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  productId?: string;
  sku?: string;
  marketplace?: string;
  account?: string;
  page?: number;
  limit?: number;
}

export interface SalesDrillDownResult {
  orders: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExportSalesDataPayload {
  workspaceId: string;
  startDate: string;
  endDate: string;
  format: 'csv' | 'xlsx' | 'json';
  metrics?: SalesMetricType[];
  dimensions?: SalesBreakdownDimension[];
  filters?: Record<string, unknown>;
}

export interface ExportResult {
  url: string;
  expiresAt: string;
}

// ── Profit Analytics (`profit-analytics` module) ────────────────────────
export type ProfitMetricType = 'gross_profit' | 'net_profit' | 'gross_margin' | 'net_margin' | 'roi' | 'contribution_margin' | 'profit_growth' | 'profit_per_unit' | 'profit_per_order';
export type ProfitDimension = 'product' | 'sku' | 'variant' | 'category' | 'supplier' | 'marketplace' | 'account' | 'warehouse' | 'country' | 'currency' | 'brand';
export type ProfitPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type ProfitComparisonType = 'previous_period' | 'same_period_last_year' | 'expected_profit' | 'target';
export type ProfitabilityCategory = 'profitable' | 'low_margin' | 'loss_making' | 'break_even' | 'high_margin';
export type LeakageType = 'excessive_fees' | 'high_returns' | 'high_refunds' | 'high_discounts' | 'high_shipping' | 'unaccounted_costs';

export interface ProfitAnalyticsFilterParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  period?: ProfitPeriod;
  marketplaceIds?: string[];
  accountIds?: string[];
  providerKeys?: string[];
  productIds?: string[];
  skus?: string[];
  categories?: string[];
  brands?: string[];
  supplierIds?: string[];
  warehouseIds?: string[];
  countries?: string[];
  currency?: string;
}

export interface ProfitComponents {
  revenue: number;
  grossSales: number;
  netSales: number;
  productCost: number;
  landedCost: number;
  marketplaceFees: number;
  fulfillmentFees: number;
  shippingCost: number;
  taxAmount: number;
  advertisingCost: number;
  discounts: number;
  returns: number;
  refunds: number;
  otherCosts: number;
}

export interface ProfitSummary {
  workspaceId: string;
  period: ProfitPeriod;
  startDate: string;
  endDate: string;
  components: ProfitComponents;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  contributionMargin: number;
  profitPerUnit: number;
  profitPerOrder: number;
  unitsSold: number;
  orderCount: number;
  currency: string;
}

export interface ProfitTrendPoint {
  workspaceId: string;
  period: ProfitPeriod;
  periodStart: string;
  periodEnd: string;
  metricType: ProfitMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
}

export interface ProfitBreakdownRow {
  workspaceId: string;
  dimension: ProfitDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: ProfitPeriod;
  startDate: string;
  endDate: string;
  components: ProfitComponents;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  contributionMargin: number;
  sharePercent?: number;
  rank?: number;
  unitsSold: number;
  orderCount: number;
  currency: string;
}

interface ProfitPeriodSnapshot {
  startDate: string;
  endDate: string;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  contributionMargin: number;
  revenue: number;
}

export interface ProfitComparison {
  workspaceId: string;
  comparisonType: ProfitComparisonType;
  currentPeriod: ProfitPeriodSnapshot;
  comparisonPeriod: ProfitPeriodSnapshot;
  variance: {
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
    roiPoints: number;
    contributionMarginPoints: number;
    revenueAmount: number;
    revenuePercent: number;
  };
  currency: string;
}

export interface ProfitabilityAnalysisRow {
  workspaceId: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  supplier?: string;
  marketplace?: string;
  profitabilityCategory: ProfitabilityCategory;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  revenue: number;
  totalCost: number;
  unitsSold: number;
  orderCount: number;
  profitPerUnit: number;
  profitShare: number;
  rank?: number;
  currency: string;
}

export interface ProfitLeakageRow {
  workspaceId: string;
  leakageType: LeakageType;
  dimension: ProfitDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  leakageAmount: number;
  leakagePercent: number;
  expectedAmount: number;
  actualAmount: number;
  impactOnProfit: number;
  impactOnMargin: number;
  currency: string;
}

export interface ProfitTarget {
  id: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: ProfitMetricType;
  targetValue: number;
  period: ProfitPeriod;
  startDate: string;
  endDate: string;
  dimensions?: Record<string, unknown>;
  currency?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfitTargetPayload {
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: ProfitMetricType;
  targetValue: number;
  period: ProfitPeriod;
  startDate: string;
  endDate: string;
  dimensions?: Record<string, unknown>;
  currency?: string;
  createdBy: string;
}

export interface ProfitTargetPerformance {
  targetId: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: ProfitMetricType;
  targetValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  achievementPercent: number;
  period: ProfitPeriod;
  startDate: string;
  endDate: string;
  currency?: string;
}

// ── Financial Analytics (`financial-analytics` module) ──────────────────
export type FinancialMetricType = 'revenue' | 'gross_profit' | 'net_profit' | 'margin' | 'roi' | 'cash_inflow' | 'cash_outflow' | 'operating_cost' | 'marketplace_fees' | 'fulfillment_fees' | 'shipping_cost' | 'tax' | 'advertising_cost' | 'discounts' | 'refunds' | 'returns_cost' | 'supplier_cost';
export type FinancialDimension = 'product' | 'sku' | 'category' | 'supplier' | 'marketplace' | 'account' | 'warehouse' | 'country' | 'region' | 'currency';
export type FinancialPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type FinancialComparisonType = 'period_over_period' | 'year_over_year' | 'expected_vs_actual' | 'budget_vs_actual';
export type FinancialHealthStatus = 'healthy' | 'warning' | 'critical' | 'loss_making';
export type FinancialAnalyticsEventType = 'performance_calculated' | 'trend_updated' | 'comparison_generated' | 'profit_leakage_detected' | 'fee_anomaly_detected' | 'settlement_delay_detected' | 'loss_making_product_detected' | 'cash_flow_risk_detected';
export type FinancialAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FinancialAnalyticsFilterParams {
  workspaceId: string;
  startDate: string;
  endDate: string;
  period?: FinancialPeriod;
  currency?: string;
  productIds?: string[];
  productSkus?: string[];
  categoryIds?: string[];
  supplierIds?: string[];
  marketplaceIds?: string[];
  accountIds?: string[];
  warehouseIds?: string[];
  countries?: string[];
  regions?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minMargin?: number;
  maxMargin?: number;
  healthStatuses?: FinancialHealthStatus[];
  minOverallScore?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RevenueMetrics {
  totalRevenue: number;
  expectedRevenue: number;
  actualRevenue: number;
  revenueVariance: number;
  revenueVariancePercent: number;
}

export interface FinancialProfitMetrics {
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  expectedProfit: number;
  actualProfit: number;
  profitVariance: number;
  profitVariancePercent: number;
}

export interface FinancialCostBreakdown {
  supplierCost: number;
  marketplaceFees: number;
  fulfillmentFees: number;
  shippingCost: number;
  tax: number;
  advertisingCost: number;
  discounts: number;
  refunds: number;
  returnsCost: number;
  otherOperatingCost: number;
  totalCost: number;
}

export interface CashFlowMetrics {
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  operatingCashFlow: number;
  receivables: number;
  payables: number;
  pendingSettlements: number;
}

export interface SettlementMetrics {
  expectedSettlement: number;
  actualSettlement: number;
  settlementVariance: number;
  settlementVariancePercent: number;
  deductions: number;
  reconciliationDifferences: number;
  averageSettlementDays: number;
}

export interface FinancialPerformance {
  workspaceId: string;
  period: FinancialPeriod;
  startDate: string;
  endDate: string;
  currency: string;
  productId?: string;
  productSku?: string;
  categoryId?: string;
  supplierId?: string;
  marketplaceId?: string;
  accountId?: string;
  warehouseId?: string;
  country?: string;
  region?: string;
  revenueMetrics: RevenueMetrics;
  profitMetrics: FinancialProfitMetrics;
  costBreakdown: FinancialCostBreakdown;
  cashFlowMetrics: CashFlowMetrics;
  settlementMetrics: SettlementMetrics;
  healthStatus: FinancialHealthStatus;
  overallScore: number;
}

export interface FinancialTrendPoint {
  period: string;
  metricValue: number;
  metricType: FinancialMetricType;
  currency: string;
  normalizedValue?: number;
  changeFromPrevious?: number;
  changeFromPreviousPercent?: number;
}

export interface FinancialBreakdownRow {
  dimensionValue: string;
  dimensionLabel?: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  totalCost: number;
  orderCount: number;
  contribution: number;
  contributionPercent: number;
  healthStatus: FinancialHealthStatus;
}

interface FinancialComparisonSnapshot {
  revenueMetrics: RevenueMetrics;
  profitMetrics: FinancialProfitMetrics;
  costBreakdown: FinancialCostBreakdown;
  cashFlowMetrics: CashFlowMetrics;
  settlementMetrics: SettlementMetrics;
  overallScore: number;
}

export interface FinancialComparison {
  workspaceId: string;
  comparisonType: FinancialComparisonType;
  period: FinancialPeriod;
  startDate: string;
  endDate: string;
  currency: string;
  actualMetrics: FinancialComparisonSnapshot;
  comparisonMetrics: FinancialComparisonSnapshot;
  variance: {
    revenueVariance: number;
    revenueVariancePercent: number;
    profitVariance: number;
    profitVariancePercent: number;
    marginPoints: number;
    cashFlowVariance: number;
    overallScorePoints: number;
  };
  marketplaceId?: string;
  productId?: string;
}

export interface FinancialAlert {
  id: string;
  workspaceId: string;
  alertType: FinancialAnalyticsEventType;
  severity: FinancialAlertSeverity;
  message: string;
  detectedAt: string;
  productId?: string;
  productSku?: string;
  marketplaceId?: string;
  supplierId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: string;
}

// ── AI: shared enums (`src/ai/interfaces/ai-provider-enums.ts`) ─────────
export type AiCapability = 'TEXT_GENERATION' | 'REASONING' | 'VISION' | 'IMAGE_GENERATION' | 'EMBEDDING' | 'VALIDATION' | 'CLASSIFICATION' | 'STRUCTURED_OUTPUT';

// ── AI Provider Registry (`ai-provider-registry` module) ────────────────
export type ProviderRegistrationStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';

export interface AiModelDescriptor {
  modelId: string;
  displayName?: string;
  capabilities: AiCapability[];
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  deprecated?: boolean;
}

export interface AiProviderRegistryEntry {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  adapterKey: string;
  displayName: string;
  version: string;
  status: ProviderRegistrationStatus;
  capabilities: AiCapability[];
  supportedModels: AiModelDescriptor[];
  regions: string[];
  priority: number;
  isDefault: boolean;
  fallbackOrder: string[];
  metadata?: Record<string, unknown>;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderRegistryPayload {
  providerKey: string;
  adapterKey: string;
  displayName: string;
  version: string;
  isGlobal?: boolean;
  capabilities: AiCapability[];
  supportedModels?: AiModelDescriptor[];
  regions?: string[];
  priority?: number;
  isDefault?: boolean;
  fallbackOrder?: string[];
  metadata?: Record<string, unknown>;
}

export type UpdateAiProviderRegistryPayload = Partial<Omit<CreateAiProviderRegistryPayload, 'providerKey'>>;

export interface AiProviderRegistryFilterParams extends PaginationParams {
  providerKey?: string;
  adapterKey?: string;
  capability?: AiCapability;
  status?: ProviderRegistrationStatus;
}

export type AiProviderRegistryListResult = PaginatedResult<AiProviderRegistryEntry>;

// ── AI Provider Configuration (`ai-provider-configuration` module) ──────
export type AiConfigScope = 'GLOBAL' | 'WORKSPACE' | 'USE_CASE' | 'MODEL';
export type AiConfigStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';

export interface AiProviderConfigPayload {
  capabilities?: AiCapability[];
  models?: AiModelDescriptor[];
  defaultModelId?: string;
  fallbackOrder?: string[];
  baseUrl?: string;
  region?: string;
  timeoutPolicy?: { requestTimeoutMs: number; connectTimeoutMs?: number };
  retryPolicy?: { maxAttempts: number; backoffMs: number; backoffMultiplier?: number };
  rateLimitPolicy?: { maxRequestsPerMinute?: number; maxTokensPerMinute?: number; maxConcurrentRequests?: number };
  fallbackPolicy?: { fallbackProviderKeys: string[]; fallbackOnErrorCodes?: string[] };
  modelParameters?: { temperature?: number; maxTokens?: number; topP?: number };
  limits?: { maxTokensPerRequest?: number; maxTokensPerDay?: number; maxRequestsPerDay?: number; maxCostPerDayUsd?: number; maxCostPerMonthUsd?: number; budgetAlertThresholdPercent?: number };
  featureFlags?: Record<string, boolean>;
  caching?: { enabled?: boolean; ttlSeconds?: number };
  safety?: { contentFilterEnabled?: boolean; blockedTerms?: string[]; piiRedactionEnabled?: boolean };
  credentials?: { credentialRef: string; type?: string };
  metadata?: Record<string, unknown>;
}

export interface AiProviderConfig {
  id: string;
  workspaceId?: string | null;
  scope: AiConfigScope;
  providerKey: string;
  useCase?: string | null;
  modelId?: string | null;
  name: string;
  description?: string | null;
  status: AiConfigStatus;
  priority: number;
  version: number;
  publishedVersion?: number | null;
  payload: AiProviderConfigPayload;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderConfigPayload {
  scope: AiConfigScope;
  providerKey: string;
  useCase?: string;
  modelId?: string;
  name: string;
  description?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  payload?: AiProviderConfigPayload;
}

export type UpdateAiProviderConfigPayload = Partial<Pick<CreateAiProviderConfigPayload, 'name' | 'description' | 'priority' | 'effectiveFrom' | 'effectiveTo' | 'payload'>>;

export interface AiProviderConfigFilterParams extends PaginationParams {
  providerKey?: string;
  useCase?: string;
  modelId?: string;
  scope?: AiConfigScope;
  status?: AiConfigStatus;
}

export type AiProviderConfigListResult = PaginatedResult<AiProviderConfig>;

export interface AiProviderConfigHistoryEntry {
  id: string;
  configId: string;
  providerKey: string;
  version: number;
  status: AiConfigStatus;
  payload: AiProviderConfigPayload;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── AI Provider Credentials (`ai-provider-credentials` module) ──────────
// NOTE: raw secret material (`fields`/`encryptedFields`) is NEVER returned by any endpoint — only
// request-only payloads accept it, and it must never be rendered. Only masked/"configured" state.
export type CredentialType = 'API_KEY' | 'OAUTH' | 'ACCESS_TOKEN' | 'REFRESH_TOKEN' | 'CUSTOM';
export type CredentialStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'INVALID' | 'VALIDATION_FAILED' | 'REVOKED';

export interface AiProviderCredential {
  id: string;
  workspaceId: string;
  providerKey: string;
  modelId?: string | null;
  accountId?: string | null;
  credentialSetName: string;
  description?: string | null;
  type: CredentialType;
  status: CredentialStatus;
  version: number;
  expiresAt?: string | null;
  lastValidatedAt?: string | null;
  lastRotatedAt?: string | null;
  lastRefreshedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiProviderCredentialPayload {
  providerKey: string;
  modelId?: string;
  accountId?: string;
  credentialSetName: string;
  description?: string;
  type: CredentialType;
  /** Plaintext secret material for exactly one request cycle — encrypted server-side immediately, never echoed back. */
  fields: Record<string, string>;
  expiresAt?: string;
}

export type UpdateAiProviderCredentialPayload = Partial<Pick<CreateAiProviderCredentialPayload, 'credentialSetName' | 'description' | 'fields' | 'expiresAt'>>;

export interface RotateAiProviderCredentialPayload {
  fields: Record<string, string>;
  expiresAt?: string;
  reason?: string;
}

export interface AiProviderCredentialFilterParams extends PaginationParams {
  providerKey?: string;
  modelId?: string;
  accountId?: string;
  status?: CredentialStatus;
  type?: CredentialType;
}

export type AiProviderCredentialListResult = PaginatedResult<AiProviderCredential>;

export interface AiProviderCredentialHistoryEntry {
  id: string;
  credentialId: string;
  providerKey: string;
  version: number;
  status: CredentialStatus;
  expiresAt?: string | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface AiConnectionValidationResult {
  valid: boolean;
  checkedAt: string;
  message?: string;
  latencyMs?: number;
}

// ── AI Provider Expansion / Rollout (`ai-provider-expansion` module) ────
export type AiProviderRolloutState = 'DRAFT' | 'BETA' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type AdapterCompatibilityStatus = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNVALIDATED';
export type EligibilityScope = 'ALL' | 'ALLOWLIST';

export interface AiProviderExpansion {
  id: string;
  providerKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState: AiProviderRolloutState;
  version: number;
  apiVersionLabel?: string | null;
  backwardCompatibleApiVersions: string[];
  eligibilityScope: EligibilityScope;
  eligibleWorkspaceIds: string[];
  adapterCompatibilityStatus: AdapterCompatibilityStatus;
  compatibilityIssues: string[];
  featureFlags: Record<string, unknown>;
  onboardedAt?: string | null;
  betaAt?: string | null;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  disabledAt?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardAiProviderPayload {
  providerKey: string;
  organizationId?: string;
  apiVersionLabel?: string;
  backwardCompatibleApiVersions?: string[];
  eligibilityScope?: EligibilityScope;
  eligibleWorkspaceIds?: string[];
  featureFlags?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  isGlobal?: boolean;
}

export interface AiProviderExpansionFilterParams extends PaginationParams {
  providerKey?: string;
  organizationId?: string;
  rolloutState?: AiProviderRolloutState;
  search?: string;
}

export type AiProviderExpansionListResult = PaginatedResult<AiProviderExpansion>;

export interface AiProviderExpansionHistoryEntry {
  id: string;
  expansionId: string;
  version: number;
  rolloutState: AiProviderRolloutState;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── AI Model Management (`ai-model-management` module) ───────────────────
export type AiModelStatus = 'ACTIVE' | 'DEPRECATED' | 'DISABLED' | 'ARCHIVED' | 'BETA' | 'PREVIEW';
export type AiModelCapability = 'TEXT_GENERATION' | 'REASONING' | 'VISION' | 'IMAGE_GENERATION' | 'EMBEDDING' | 'VALIDATION' | 'STRUCTURED_OUTPUT' | 'CODE_GENERATION' | 'SUMMARIZATION' | 'CLASSIFICATION';
export type AiModelModality = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'MULTIMODAL';

export interface AiModel {
  id: string;
  workspaceId?: string | null;
  provider: string;
  modelKey: string;
  displayName: string;
  version?: string | null;
  status: AiModelStatus;
  capabilities: string[];
  modalities: string[];
  contextLimit?: number | null;
  outputLimit?: number | null;
  supportsStreaming: boolean;
  supportsJsonMode: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  regions: string[];
  pricingInputPer1k?: number | null;
  pricingOutputPer1k?: number | null;
  rateLimit?: number | null;
  averageLatency?: number | null;
  qualityScore?: number | null;
  availabilityScore?: number | null;
  aliases: string[];
  isDefault: boolean;
  isPreferred: boolean;
  isFallback: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAiModelPayload {
  workspaceId?: string;
  provider: string;
  modelKey: string;
  displayName: string;
  version?: string;
  status?: AiModelStatus;
  capabilities: string[];
  modalities: string[];
  contextLimit?: number;
  outputLimit?: number;
  supportsStreaming?: boolean;
  supportsJsonMode?: boolean;
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
  regions?: string[];
  pricingInputPer1k?: number;
  pricingOutputPer1k?: number;
  qualityScore?: number;
  availabilityScore?: number;
  isDefault?: boolean;
  isPreferred?: boolean;
  isFallback?: boolean;
}

export type UpdateAiModelPayload = Partial<Omit<RegisterAiModelPayload, 'workspaceId' | 'provider' | 'modelKey'>>;

export interface AiModelFilterParams extends PaginationParams {
  workspaceId?: string;
  provider?: string;
  status?: AiModelStatus;
  capability?: string;
  modality?: string;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
  supportsVision?: boolean;
}

export type AiModelListResult = PaginatedResult<AiModel>;

export interface AiModelConfiguration {
  id: string;
  workspaceId: string;
  modelId: string;
  capability: string;
  useCase?: string | null;
  isDefault: boolean;
  isPreferred: boolean;
  priority: number;
  fallbackModelIds: string[];
  maxRetries?: number | null;
  timeout?: number | null;
  temperature?: number | null;
  maxTokens?: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateModelConfigurationPayload {
  workspaceId: string;
  modelId: string;
  capability: string;
  useCase?: string;
  isDefault?: boolean;
  isPreferred?: boolean;
  priority?: number;
  fallbackModelIds?: string[];
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
  enabled?: boolean;
}

export type UpdateModelConfigurationPayload = Partial<Omit<CreateModelConfigurationPayload, 'workspaceId' | 'modelId' | 'capability'>>;

export interface ModelConfigurationFilterParams extends PaginationParams {
  workspaceId: string;
  modelId?: string;
  capability?: string;
  useCase?: string;
  enabled?: boolean;
}

export type ModelConfigurationListResult = PaginatedResult<AiModelConfiguration>;

export interface ModelResolutionParams {
  workspaceId?: string;
  provider?: string;
  capability?: AiModelCapability;
  useCase?: string;
  minQualityScore?: number;
  requiresStreaming?: boolean;
  requiresJsonMode?: boolean;
  requiresFunctionCalling?: boolean;
  requiresVision?: boolean;
}

export interface ResolvedModel {
  model: AiModel;
  configuration?: AiModelConfiguration;
  fallbacks: AiModel[];
  reason: string;
}

export interface ModelCompatibilityResult {
  compatible: boolean;
  model: AiModel;
  capability: string;
  reason?: string;
  missingFeatures?: string[];
}

export interface ModelDiscoveryResult {
  models: AiModel[];
  total: number;
  filters: { provider?: string; capability?: string; region?: string };
}

// ── AI Capability Management (`ai-capability-management` module) ────────
export type CapabilityDefinitionStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type CapabilitySupportLevel = 'FULL' | 'PARTIAL' | 'UNSUPPORTED';
export type CapabilityOverrideScope = 'GLOBAL' | 'PROVIDER' | 'MODEL' | 'WORKSPACE';
export type CapabilityOverrideStatus = 'ACTIVE' | 'DISABLED';

export interface AiCapabilityLimits {
  maxInputTokens?: number | null;
  maxOutputTokens?: number | null;
  maxBatchSize?: number | null;
  maxInputSizeBytes?: number | null;
}

export interface AiCapabilityDefinition {
  id: string;
  capabilityKey: AiCapability;
  version: string;
  status: CapabilityDefinitionStatus;
  displayName: string;
  description?: string | null;
  limits: AiCapabilityLimits;
  dependencies: AiCapability[];
  requiredRoles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiCapabilityDefinitionPayload {
  capabilityKey: AiCapability;
  version: string;
  displayName: string;
  description?: string;
  limits?: AiCapabilityLimits;
  dependencies?: AiCapability[];
  requiredRoles?: string[];
  metadata?: Record<string, unknown>;
}

export type UpdateAiCapabilityDefinitionPayload = Partial<Omit<CreateAiCapabilityDefinitionPayload, 'capabilityKey'>>;

export interface AiCapabilityDefinitionFilterParams extends PaginationParams {
  capabilityKey?: AiCapability;
  status?: CapabilityDefinitionStatus;
}

export type AiCapabilityDefinitionListResult = PaginatedResult<AiCapabilityDefinition>;

export interface AiCapabilityOverride {
  id: string;
  scope: CapabilityOverrideScope;
  capabilityKey: AiCapability;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  supportLevel: CapabilitySupportLevel;
  status: CapabilityOverrideStatus;
  featureFlag?: string | null;
  limitsOverride?: AiCapabilityLimits | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiCapabilityOverridePayload {
  scope: CapabilityOverrideScope;
  capabilityKey: AiCapability;
  providerKey?: string;
  modelId?: string;
  supportLevel: CapabilitySupportLevel;
  featureFlag?: string;
  limitsOverride?: AiCapabilityLimits;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateAiCapabilityOverridePayload = Partial<Pick<CreateAiCapabilityOverridePayload, 'supportLevel' | 'featureFlag' | 'limitsOverride' | 'priority' | 'metadata'>>;

export interface AiCapabilityOverrideFilterParams extends PaginationParams {
  scope?: CapabilityOverrideScope;
  capabilityKey?: AiCapability;
  providerKey?: string;
  modelId?: string;
  status?: CapabilityOverrideStatus;
}

export type AiCapabilityOverrideListResult = PaginatedResult<AiCapabilityOverride>;

export interface ResolveAiCapabilityParams {
  capabilityKey: AiCapability;
  providerKey?: string;
  modelId?: string;
  useCase?: string;
  region?: string;
}

export interface AiCapabilityResolutionResult {
  available: boolean;
  supportLevel: CapabilitySupportLevel;
  capabilityKey: AiCapability;
  providerKey?: string;
  modelId?: string;
  effectiveLimits?: AiCapabilityLimits;
  reasons: string[];
}

// ── AI Orchestrator (`ai-orchestrator` module) ───────────────────────────
export type AiExecutionMode = 'SYNC' | 'ASYNC' | 'STREAMING';
export type AiRequestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
export type AiRoutingStrategy = 'COST_OPTIMIZED' | 'LATENCY_OPTIMIZED' | 'QUALITY_OPTIMIZED' | 'BALANCED' | 'CUSTOM';

export interface AiRequest {
  id: string;
  workspaceId: string;
  useCase: string;
  capability: string;
  provider?: string | null;
  modelId?: string | null;
  prompt: string;
  status: AiRequestStatus;
  executionMode: AiExecutionMode;
  priority: number;
  routingStrategy: AiRoutingStrategy;
  maxRetries: number;
  timeout?: number | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiRequestPayload {
  workspaceId: string;
  useCase: string;
  capability: string;
  provider?: string;
  modelId?: string;
  prompt: string;
  context?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  executionMode?: AiExecutionMode;
  priority?: number;
  routingStrategy?: AiRoutingStrategy;
  maxRetries?: number;
  timeout?: number;
  userId?: string;
}

export type ExecuteAiRequestPayload = Omit<CreateAiRequestPayload, 'provider' | 'modelId'>;

export interface AiRequestFilterParams extends PaginationParams {
  workspaceId?: string;
  useCase?: string;
  capability?: string;
  provider?: string;
  status?: AiRequestStatus;
  executionMode?: AiExecutionMode;
  userId?: string;
}

export type AiRequestListResult = PaginatedResult<AiRequest>;

export interface AiExecutionResult {
  requestId: string;
  content: string;
  provider: string;
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  metadata: Record<string, unknown>;
}

export interface AiExecutionLog {
  id: string;
  requestId: string;
  workspaceId: string;
  provider: string;
  modelKey: string;
  capability: string;
  useCase: string;
  status: string;
  startTime: string;
  endTime?: string | null;
  latency?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  attemptNumber: number;
  fallbackUsed: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  routingStrategy?: string | null;
  createdAt: string;
}

export interface AiExecutionLogFilterParams extends PaginationParams {
  workspaceId?: string;
  requestId?: string;
  provider?: string;
  modelKey?: string;
  capability?: string;
  useCase?: string;
  status?: string;
}

export type AiExecutionLogListResult = PaginatedResult<AiExecutionLog>;

export interface AiOrchestratorStats {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalCost: number;
  totalTokens: number;
  averageLatency: number;
}

// ── AI Agent (`ai-agent` module) ─────────────────────────────────────────
export type AiAgentStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED' | 'DRAFT' | 'ARCHIVED';
export type AiAgentType = 'CONVERSATIONAL' | 'TASK' | 'WORKFLOW' | 'AUTONOMOUS' | 'SPECIALIST' | 'ORCHESTRATOR';
export type AiAgentExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED' | 'TIMEOUT';

export interface AiAgent {
  id: string;
  workspaceId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: AiAgentType;
  status: AiAgentStatus;
  capabilities: string[];
  primaryCapability: string;
  persona?: string | null;
  instructions?: string | null;
  systemPrompt?: string | null;
  modelId?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  topP?: number | null;
  tools: unknown;
  toolChoice?: string | null;
  contextWindowSize?: number | null;
  maxTurns?: number | null;
  enableMemory: boolean;
  enableContext: boolean;
  timeout?: number | null;
  maxRetries: number;
  tags: string[];
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiAgentPayload {
  workspaceId?: string;
  key: string;
  name: string;
  description?: string;
  type: AiAgentType;
  status?: AiAgentStatus;
  capabilities: string[];
  primaryCapability: string;
  persona?: string;
  instructions?: string;
  systemPrompt?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: unknown[];
  contextWindowSize?: number;
  maxTurns?: number;
  enableMemory?: boolean;
  enableContext?: boolean;
  timeout?: number;
  maxRetries?: number;
  tags?: string[];
  isDefault?: boolean;
  isPublic?: boolean;
}

export type UpdateAiAgentPayload = Partial<Omit<CreateAiAgentPayload, 'workspaceId' | 'key'>>;

export interface AiAgentFilterParams extends PaginationParams {
  workspaceId?: string;
  type?: string;
  status?: string;
  capability?: string;
  tag?: string;
}

export type AiAgentListResult = PaginatedResult<AiAgent>;

export interface AiAgentConfiguration {
  id: string;
  workspaceId: string;
  agentId: string;
  useCase: string;
  overrideInstructions?: string | null;
  overrideSystemPrompt?: string | null;
  customModelId?: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentConfigurationPayload {
  workspaceId: string;
  agentId: string;
  useCase: string;
  overrideInstructions?: string;
  overrideSystemPrompt?: string;
  customModelId?: string;
  customParameters?: Record<string, unknown>;
  enabled?: boolean;
  priority?: number;
}

export type UpdateAgentConfigurationPayload = Partial<Omit<CreateAgentConfigurationPayload, 'workspaceId' | 'agentId' | 'useCase'>>;

export interface ExecuteAgentPayload {
  workspaceId: string;
  agentId: string;
  input: string;
  context?: Record<string, unknown>;
  sessionId?: string;
  userId?: string;
}

export interface AiAgentExecution {
  id: string;
  workspaceId: string;
  agentId: string;
  sessionId?: string | null;
  workflowId?: string | null;
  input: string;
  output?: string | null;
  status: AiAgentExecutionStatus;
  startTime: string;
  endTime?: string | null;
  totalTokens?: number | null;
  totalCost?: number | null;
  turns: number;
  stepsCompleted: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  contextSnapshots?: AiAgentContextSnapshot[];
}

export interface AiAgentContextSnapshot {
  id: string;
  executionId: string;
  turnNumber: number;
  userMessage?: string | null;
  agentResponse?: string | null;
  tokens?: number | null;
  cost?: number | null;
  latency?: number | null;
  createdAt: string;
}

export interface AgentExecutionFilterParams extends PaginationParams {
  workspaceId?: string;
  agentId?: string;
  sessionId?: string;
  status?: string;
  userId?: string;
}

export type AgentExecutionListResult = PaginatedResult<AiAgentExecution>;

export interface AgentExecutionResult {
  executionId: string;
  output: string;
  turns: number;
  totalTokens: number;
  totalCost: number;
  duration: number;
  metadata: Record<string, unknown>;
}

export interface AiAgentStats {
  totalExecutions?: number;
  completedExecutions?: number;
  failedExecutions?: number;
  totalCost?: number;
  totalTokens?: number;
  averageDuration?: number;
}

// ── AI Prompt (`ai-prompt` module) ───────────────────────────────────────
export type AiPromptType = 'SYSTEM' | 'USER' | 'AGENT' | 'VALIDATION' | 'TRANSFORMATION' | 'FORMATTING';
export type AiPromptStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export interface AiPrompt {
  id: string;
  workspaceId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: AiPromptType;
  useCase: string;
  capability?: string | null;
  agentId?: string | null;
  version: number;
  status: AiPromptStatus;
  template: string;
  variables: string[];
  requiredVariables: string[];
  locale: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  parentPromptId?: string | null;
  usageCount: number;
  qualityScore?: number | null;
  failureCount: number;
  tags: string[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiPromptPayload {
  workspaceId?: string;
  key: string;
  name: string;
  description?: string;
  type: AiPromptType;
  useCase: string;
  capability?: string;
  agentId?: string;
  template: string;
  variables?: string[];
  requiredVariables?: string[];
  locale?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  tags?: string[];
}

export type UpdateAiPromptPayload = Partial<Omit<CreateAiPromptPayload, 'workspaceId' | 'key'>>;

export interface AiPromptFilterParams extends PaginationParams {
  workspaceId?: string;
  key?: string;
  type?: string;
  useCase?: string;
  capability?: string;
  agentId?: string;
  status?: string;
  locale?: string;
  tag?: string;
}

export type AiPromptListResult = PaginatedResult<AiPrompt>;

export interface AiPromptVersion {
  id: string;
  promptId: string;
  version: number;
  template: string;
  variables: string[];
  requiredVariables: string[];
  changeDescription?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface CreatePromptVersionPayload {
  promptId: string;
  template: string;
  variables?: string[];
  requiredVariables?: string[];
  changeDescription?: string;
}

export interface RollbackPromptPayload {
  promptId: string;
  targetVersion: number;
  workspaceId?: string;
}

export interface ResolvePromptParams {
  workspaceId?: string;
  key?: string;
  useCase?: string;
  capability?: string;
  agentId?: string;
  locale?: string;
}

export interface ResolvedPrompt {
  prompt: AiPrompt;
  compiledTemplate: string;
  variables: string[];
  requiredVariables: string[];
  resolvedFrom: 'workspace' | 'global' | 'default';
}

export interface CompilePromptPayload {
  promptId: string;
  workspaceId?: string;
  variables: Record<string, unknown>;
}

export interface CompiledPrompt {
  promptId: string;
  version: number;
  compiled: string;
  variables: Record<string, unknown>;
}

export interface AiPromptStats {
  totalUsage: number;
  successRate: number;
  averageTokens: number;
  totalCost: number;
  qualityScore: number;
}

// ── AI Workflow (`ai-workflow` module) ───────────────────────────────────
export type AiWorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DEPRECATED' | 'ARCHIVED';
export type AiWorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED' | 'TIMEOUT' | 'COMPENSATING';
export type AiWorkflowTriggerType = 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'API';
export type AiWorkflowStepType = 'AGENT' | 'ORCHESTRATOR' | 'PROMPT' | 'CONDITION' | 'LOOP' | 'PARALLEL' | 'WAIT' | 'WEBHOOK' | 'COMPENSATION';

export interface AiWorkflowStep {
  id: string;
  type: AiWorkflowStepType;
  name: string;
  config: Record<string, unknown>;
  condition?: string;
  onSuccess?: string[];
  onFailure?: string[];
  retries?: number;
  timeout?: number;
}

export interface AiWorkflow {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | null;
  version: number;
  status: AiWorkflowStatus;
  triggerType: AiWorkflowTriggerType;
  steps: AiWorkflowStep[];
  timeout?: number | null;
  maxRetries: number;
  fallbackWorkflowId?: string | null;
  tags: string[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiWorkflowPayload {
  workspaceId: string;
  key: string;
  name: string;
  description?: string;
  triggerType: AiWorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  steps: AiWorkflowStep[];
  timeout?: number;
  maxRetries?: number;
  fallbackWorkflowId?: string;
  tags?: string[];
}

export type UpdateAiWorkflowPayload = Partial<Omit<CreateAiWorkflowPayload, 'workspaceId' | 'key'>>;

export interface AiWorkflowFilterParams extends PaginationParams {
  workspaceId?: string;
  key?: string;
  status?: string;
  triggerType?: string;
  tag?: string;
}

export type AiWorkflowListResult = PaginatedResult<AiWorkflow>;

export interface ExecuteWorkflowPayload {
  workspaceId: string;
  workflowId: string;
  input?: unknown;
  triggerType?: AiWorkflowTriggerType;
  triggeredBy?: string;
}

export interface AiWorkflowStepExecution {
  id: string;
  executionId: string;
  stepId: string;
  stepIndex: number;
  stepType: AiWorkflowStepType;
  input?: unknown;
  output?: unknown;
  status: string;
  startTime: string;
  endTime?: string | null;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  cost?: number | null;
  tokens?: number | null;
  createdAt: string;
}

export interface AiWorkflowExecution {
  id: string;
  workspaceId: string;
  workflowId: string;
  version: number;
  triggerType: AiWorkflowTriggerType;
  triggeredBy?: string | null;
  input?: unknown;
  output?: unknown;
  status: AiWorkflowExecutionStatus;
  currentStepIndex?: number | null;
  currentStepId?: string | null;
  startTime: string;
  endTime?: string | null;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted: boolean;
  totalCost?: number | null;
  totalTokens?: number | null;
  createdAt: string;
  updatedAt: string;
  stepExecutions?: AiWorkflowStepExecution[];
}

export interface WorkflowExecutionFilterParams extends PaginationParams {
  workspaceId?: string;
  workflowId?: string;
  status?: string;
  triggerType?: string;
  triggeredBy?: string;
}

export type WorkflowExecutionListResult = PaginatedResult<AiWorkflowExecution>;

export interface WorkflowExecutionResult {
  executionId: string;
  status: AiWorkflowExecutionStatus;
  output?: unknown;
  totalCost: number;
  totalTokens: number;
  duration: number;
  stepsCompleted: number;
}

export interface AiWorkflowSchedule {
  id: string;
  workspaceId: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastExecutionAt?: string | null;
  nextExecutionAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowSchedulePayload {
  workspaceId: string;
  workflowId: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  input?: unknown;
}

export type UpdateWorkflowSchedulePayload = Partial<Pick<CreateWorkflowSchedulePayload, 'cronExpression' | 'timezone' | 'enabled' | 'input'>>;

export interface AiWorkflowStats {
  totalExecutions?: number;
  completedExecutions?: number;
  failedExecutions?: number;
  totalCost?: number;
  totalTokens?: number;
  averageDuration?: number;
}

// ── AI Job Scheduler (`ai-job-scheduler` module) ─────────────────────────
export type AiJobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED' | 'RETRYING' | 'TIMEOUT';
export type AiJobType = 'ONE_TIME' | 'RECURRING' | 'CRON' | 'DELAYED' | 'EVENT_TRIGGERED';
export type AiJobTaskType = 'WORKFLOW' | 'AGENT' | 'BUSINESS_TASK';
export type AiJobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AiJob {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | null;
  type: AiJobType;
  taskType: AiJobTaskType;
  priority: AiJobPriority;
  status: AiJobStatus;
  taskConfig: unknown;
  scheduleConfig?: { cronExpression?: string; interval?: number; timezone?: string; startDate?: string; endDate?: string; maxExecutions?: number } | null;
  timeout?: number | null;
  maxRetries: number;
  startAfter?: string | null;
  lastExecutedAt?: string | null;
  nextExecutionAt?: string | null;
  executionCount: number;
  successCount: number;
  failureCount: number;
  tags: string[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiJobPayload {
  workspaceId: string;
  key: string;
  name: string;
  description?: string;
  type: AiJobType;
  taskType: AiJobTaskType;
  priority?: AiJobPriority;
  taskConfig: unknown;
  scheduleConfig?: { cronExpression?: string; interval?: number; timezone?: string; startDate?: string; endDate?: string; maxExecutions?: number };
  timeout?: number;
  maxRetries?: number;
  startAfter?: string;
  tags?: string[];
}

export type UpdateAiJobPayload = Partial<Omit<CreateAiJobPayload, 'workspaceId' | 'key'>> & { status?: AiJobStatus };

export interface AiJobFilterParams extends PaginationParams {
  workspaceId: string;
  key?: string;
  type?: AiJobType;
  taskType?: AiJobTaskType;
  status?: AiJobStatus;
  priority?: AiJobPriority;
  tag?: string;
}

export type AiJobListResult = PaginatedResult<AiJob>;

export interface ExecuteJobPayload {
  workspaceId: string;
  jobId: string;
  input?: unknown;
  triggeredBy?: string;
}

export interface AiJobExecution {
  id: string;
  jobId: string;
  workspaceId: string;
  status: AiJobStatus;
  attemptNumber: number;
  input?: unknown;
  output?: unknown;
  progress?: number | null;
  progressMessage?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  workflowExecutionId?: string | null;
  agentExecutionId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  cost?: number | null;
  tokens?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobExecutionFilterParams extends PaginationParams {
  workspaceId: string;
  jobId?: string;
  status?: AiJobStatus;
}

export type JobExecutionListResult = PaginatedResult<AiJobExecution>;

export interface CreateJobDependencyPayload {
  workspaceId: string;
  jobId: string;
  dependsOnJobIds: string[];
}

export interface AiJobSchedulerStats {
  totalJobs?: number;
  activeJobs?: number;
  totalExecutions?: number;
  successRate?: number;
  failureRate?: number;
}

// ── AI Queue Management (`ai-queue-management` module) ───────────────────
export type AiQueueStatus = 'ACTIVE' | 'PAUSED' | 'DRAINING' | 'STOPPED';
export type AiQueueJobStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DELAYED' | 'PAUSED' | 'CANCELLED' | 'STUCK';
export type AiQueueJobPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type AiQueueRoutingStrategy = 'ROUND_ROBIN' | 'WEIGHTED' | 'PRIORITY' | 'LEAST_LOAD' | 'MODEL_BASED' | 'CAPABILITY_BASED';

export interface AiQueue {
  id: string;
  workspaceId?: string | null;
  name: string;
  displayName: string;
  description?: string | null;
  status: AiQueueStatus;
  routingStrategy: AiQueueRoutingStrategy;
  concurrency: number;
  rateLimit?: number | null;
  rateLimitWindow?: number | null;
  defaultPriority: AiQueueJobPriority;
  defaultTimeout?: number | null;
  defaultRetries: number;
  enableDeadLetter: boolean;
  deadLetterThreshold: number;
  enableIdempotency: boolean;
  enableMetrics: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiQueuePayload {
  workspaceId?: string;
  name: string;
  displayName: string;
  description?: string;
  routingStrategy?: AiQueueRoutingStrategy;
  concurrency?: number;
  rateLimit?: number;
  rateLimitWindow?: number;
  defaultPriority?: AiQueueJobPriority;
  defaultTimeout?: number;
  defaultRetries?: number;
  enableDeadLetter?: boolean;
  deadLetterThreshold?: number;
  enableIdempotency?: boolean;
  enableMetrics?: boolean;
  tags?: string[];
}

export type UpdateAiQueuePayload = Partial<Omit<CreateAiQueuePayload, 'workspaceId' | 'name'>> & { status?: AiQueueStatus };

export interface AiQueueFilterParams extends PaginationParams {
  workspaceId?: string;
  name?: string;
  status?: AiQueueStatus;
  tag?: string;
}

export type AiQueueListResult = PaginatedResult<AiQueue>;

export interface EnqueueJobPayload {
  queueName: string;
  workspaceId: string;
  jobType: string;
  jobData: unknown;
  priority?: AiQueueJobPriority;
  idempotencyKey?: string;
  scheduledFor?: string;
  maxRetries?: number;
  modelProvider?: string;
  modelName?: string;
  capability?: string;
}

export interface EnqueueBatchPayload {
  queueName: string;
  workspaceId: string;
  batchId?: string;
  jobs: { jobType: string; jobData: unknown; priority?: string; scheduledFor?: string }[];
}

export interface AiQueueJob {
  id: string;
  queueId: string;
  workspaceId: string;
  jobType: string;
  priority: AiQueueJobPriority;
  status: AiQueueJobStatus;
  jobData: unknown;
  idempotencyKey?: string | null;
  scheduledFor?: string | null;
  attemptNumber: number;
  maxRetries: number;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  result?: unknown;
  error?: string | null;
  processingTime?: number | null;
  progress?: number | null;
  progressMessage?: string | null;
  batchId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  capability?: string | null;
  cost?: number | null;
  tokens?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QueueJobFilterParams extends PaginationParams {
  workspaceId: string;
  queueId?: string;
  queueName?: string;
  jobType?: string;
  status?: AiQueueJobStatus;
  priority?: AiQueueJobPriority;
  batchId?: string;
}

export type QueueJobListResult = PaginatedResult<AiQueueJob>;

export interface EnqueueResult {
  jobId: string;
  queueId: string;
  status: AiQueueJobStatus;
  priority: AiQueueJobPriority;
  position?: number;
  estimatedStartTime?: string;
}

export interface AiQueueStats {
  queueId: string;
  status: AiQueueStatus;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  totalProcessed: number;
  totalFailed: number;
  avgProcessingTime?: number;
  throughput?: number;
  errorRate?: number;
  totalCost?: number;
  totalTokens?: number;
}

// ── AI Context Management (`ai-context-management` module) ──────────────
// Safe metadata fields render by default; conversationHistory/variables/toolResults/
// businessReferences/executionMetadata contain raw prompt/conversation content and must
// be gated behind an explicit "show raw content" affordance, never rendered by default.
export type AiContextType = 'REQUEST' | 'SESSION' | 'WORKFLOW' | 'AGENT' | 'TASK' | 'WORKSPACE';
export type AiContextStatus = 'ACTIVE' | 'EXPIRED' | 'ARCHIVED' | 'SUMMARIZED';
export type AiContextPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export interface AiConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
}

export interface AiContext {
  id: string;
  workspaceId: string;
  type: AiContextType;
  status: AiContextStatus;
  priority: AiContextPriority;
  correlationId?: string | null;
  parentContextId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  workflowExecutionId?: string | null;
  agentExecutionId?: string | null;
  taskId?: string | null;
  variables?: Record<string, unknown> | null;
  conversationHistory?: AiConversationMessage[] | null;
  toolResults?: unknown | null;
  businessReferences?: unknown | null;
  executionMetadata?: unknown | null;
  summary?: string | null;
  version: number;
  sizeBytes?: number | null;
  tokenEstimate?: number | null;
  maxTokens?: number | null;
  windowSize?: number | null;
  source?: string | null;
  expiresAt?: string | null;
  lastAccessedAt?: string | null;
  allowInheritance: boolean;
  allowBranching: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiContextPayload {
  workspaceId: string;
  type: AiContextType;
  priority?: AiContextPriority;
  correlationId?: string;
  parentContextId?: string;
  userId?: string;
  sessionId?: string;
  workflowExecutionId?: string;
  agentExecutionId?: string;
  taskId?: string;
  variables?: Record<string, unknown>;
  maxTokens?: number;
  windowSize?: number;
  source?: string;
  expiresAt?: string;
  allowInheritance?: boolean;
  allowBranching?: boolean;
  tags?: string[];
}

export interface AiContextFilterParams extends PaginationParams {
  workspaceId: string;
  type?: AiContextType;
  status?: AiContextStatus;
  priority?: AiContextPriority;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  tag?: string;
}

export type AiContextListResult = PaginatedResult<AiContext>;

export interface MergeContextPayload {
  workspaceId: string;
  targetContextId: string;
  sourceContextIds: string[];
  mergeStrategy?: 'replace' | 'append' | 'merge';
}

export interface ContextMergeResult {
  contextId: string;
  version: number;
  tokensAdded: number;
  tokenEstimate: number;
}

export interface ContextSummaryResult {
  contextId: string;
  summary: string;
  originalTokens: number;
  summaryTokens: number;
  compressionRatio: number;
}

export interface AiContextVersionEntry {
  id: string;
  contextId: string;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface AiContextStats {
  totalContexts?: number;
  activeContexts?: number;
  averageTokenEstimate?: number;
  totalTokensSaved?: number;
}

// ── AI Cache Management (`ai-cache-management` module) ───────────────────
// NOTE: `SEMANTIC` and `PARTIAL_RESULT` strategies always miss in the current backend —
// only `EXACT_MATCH` performs a real lookup. Surface this honestly, don't imply otherwise.
export type AiCacheScope = 'GLOBAL' | 'WORKSPACE' | 'USER' | 'WORKFLOW' | 'REQUEST';
export type AiCacheStrategy = 'EXACT_MATCH' | 'SEMANTIC' | 'PARTIAL_RESULT';
export type AiCacheStatus = 'VALID' | 'STALE' | 'EXPIRED' | 'INVALIDATED' | 'WARMING';

export interface AiCacheEntry {
  id: string;
  workspaceId: string;
  cacheKey: string;
  scope: AiCacheScope;
  strategy: AiCacheStrategy;
  status: AiCacheStatus;
  capability: string;
  useCase?: string | null;
  provider: string;
  model: string;
  promptVersion?: string | null;
  userId?: string | null;
  workflowId?: string | null;
  tokensUsed: number;
  cost: number;
  latencyMs: number;
  hitCount: number;
  lastHitAt?: string | null;
  ttlSeconds: number;
  expiresAt: string;
  staleAt?: string | null;
  sensitiveData: boolean;
  bypassable: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AiCacheEntryFilterParams extends PaginationParams {
  workspaceId: string;
  scope?: AiCacheScope;
  strategy?: AiCacheStrategy;
  status?: AiCacheStatus;
  capability?: string;
  provider?: string;
  model?: string;
  sensitiveData?: boolean;
}

export type AiCacheEntryListResult = PaginatedResult<AiCacheEntry>;

export interface AiCachePolicy {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  scope: AiCacheScope;
  strategy: AiCacheStrategy;
  capability?: string | null;
  useCase?: string | null;
  provider?: string | null;
  model?: string | null;
  enabled: boolean;
  priority: number;
  ttlSeconds: number;
  staleTtlSeconds?: number | null;
  enableSemanticCache?: boolean;
  enablePartialCache?: boolean;
  bypassOnSensitive?: boolean;
  maxCacheSize?: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCachePolicyPayload {
  workspaceId?: string;
  name: string;
  description?: string;
  scope: AiCacheScope;
  strategy: AiCacheStrategy;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  enabled?: boolean;
  priority?: number;
  ttlSeconds: number;
  staleTtlSeconds?: number;
  enableSemanticCache?: boolean;
  enablePartialCache?: boolean;
  bypassOnSensitive?: boolean;
  maxCacheSize?: number;
  tags?: string[];
}

export type UpdateCachePolicyPayload = Partial<Omit<CreateCachePolicyPayload, 'workspaceId'>>;

export interface AiCacheSavings {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  tokensSaved: number;
  costSaved: number;
  latencySavedMs: number;
  averageLatencySavedMs: number;
}

// ── AI Fallback & Retry (`ai-fallback-retry` module) ─────────────────────
export type AiRetryStatus = 'PENDING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'EXHAUSTED' | 'CANCELLED';
export type AiFailureType = 'PROVIDER_ERROR' | 'MODEL_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'VALIDATION_ERROR' | 'SAFETY_ERROR' | 'UNAUTHORIZED' | 'BUDGET_EXCEEDED' | 'QUOTA_EXCEEDED' | 'CIRCUIT_OPEN' | 'NETWORK_ERROR' | 'UNKNOWN';
export type AiBackoffStrategy = 'FIXED' | 'LINEAR' | 'EXPONENTIAL' | 'EXPONENTIAL_JITTER';

export interface AiRetryExecution {
  id: string;
  workspaceId: string;
  status: AiRetryStatus;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  capability: string;
  useCase?: string | null;
  originalProvider: string;
  originalModel: string;
  currentAttempt: number;
  maxAttempts: number;
  lastFailureType?: AiFailureType | null;
  lastFailureMessage?: string | null;
  finalProvider?: string | null;
  finalModel?: string | null;
  totalTokensUsed: number;
  totalCost: number;
  startTime?: string | null;
  endTime?: string | null;
  totalDuration?: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RetryExecutionFilterParams extends PaginationParams {
  workspaceId: string;
  status?: AiRetryStatus;
  capability?: string;
  originalProvider?: string;
}

export type RetryExecutionListResult = PaginatedResult<AiRetryExecution>;

export interface AiRetryAttempt {
  id: string;
  retryExecutionId: string;
  attemptNumber: number;
  provider: string;
  model: string;
  succeeded: boolean;
  failureType?: AiFailureType | null;
  failureMessage?: string | null;
  tokensUsed?: number | null;
  cost?: number | null;
  delayBeforeRetryMs?: number | null;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface AiFallbackExecution {
  id: string;
  retryExecutionId: string;
  sourceProvider: string;
  sourceModel: string;
  fallbackProvider: string;
  fallbackModel: string;
  reason: string;
  triggerFailureType: AiFailureType;
  succeeded: boolean;
  tokensUsed?: number | null;
  cost?: number | null;
  startTime: string;
  endTime?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface AiRetryPolicy {
  id: string;
  workspaceId?: string | null;
  name: string;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  maxRetries: number;
  initialDelayMs?: number | null;
  maxDelayMs?: number | null;
  backoffMultiplier?: number | null;
  backoffStrategy: AiBackoffStrategy;
  enableFallback: boolean;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetryPolicyPayload {
  workspaceId?: string;
  name: string;
  capability?: string;
  useCase?: string;
  modelProvider?: string;
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  backoffStrategy?: AiBackoffStrategy;
  enableFallback?: boolean;
  enabled?: boolean;
  priority?: number;
}

export type UpdateRetryPolicyPayload = Partial<Omit<CreateRetryPolicyPayload, 'workspaceId'>>;

export interface AiFallbackConfig {
  id: string;
  workspaceId?: string | null;
  name: string;
  capability: string;
  useCase?: string | null;
  sourceProvider?: string | null;
  sourceModel?: string | null;
  fallbackProvider: string;
  fallbackModel: string;
  priority: number;
  enabled: boolean;
  triggerFailureTypes: string[];
  requireHealthCheck: boolean;
  requireBudget: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFallbackConfigPayload {
  workspaceId?: string;
  name: string;
  capability: string;
  useCase?: string;
  sourceProvider?: string;
  sourceModel?: string;
  fallbackProvider: string;
  fallbackModel: string;
  priority?: number;
  enabled?: boolean;
  triggerFailureTypes?: string[];
  requireHealthCheck?: boolean;
  requireBudget?: boolean;
}

export type UpdateFallbackConfigPayload = Partial<Omit<CreateFallbackConfigPayload, 'workspaceId' | 'capability'>>;

export interface AiRetryStats {
  totalExecutions: number;
  succeededExecutions: number;
  exhaustedExecutions: number;
  successRate: number;
  avgAttempts: number;
  avgTokensUsed: number;
  avgCost: number;
  avgDuration: number;
}

// ── AI Response Validation (`ai-response-validation` module) ─────────────
export type AiResponseValidationStatus = 'PENDING' | 'VALIDATING' | 'VALID' | 'INVALID' | 'REPAIRED' | 'REJECTED';
export type AiResponseValidationType = 'SCHEMA' | 'TYPE' | 'FORMAT' | 'COMPLETENESS' | 'CONSISTENCY' | 'BUSINESS_RULE' | 'SAFETY' | 'CONFIDENCE';

export interface ValidateResponsePayload {
  workspaceId: string;
  response: unknown;
  responseType: string;
  capability?: string;
  useCase?: string;
  modelProvider?: string;
  modelName?: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
}

export interface ValidationError {
  validationType: AiResponseValidationType;
  validatorName: string;
  errorCode: string;
  errorMessage: string;
  fieldPath?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  validationType: AiResponseValidationType;
  validatorName: string;
  message: string;
  fieldPath?: string;
  suggestion?: string;
}

export interface ValidationResult {
  validationId: string;
  status: AiResponseValidationStatus;
  overallValid: boolean;
  confidenceScore?: number;
  qualityScore?: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface AiResponseValidation {
  id: string;
  workspaceId: string;
  status: AiResponseValidationStatus;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  originalResponse: unknown;
  validatedResponse?: unknown | null;
  responseType: string;
  overallValid: boolean;
  confidenceScore?: number | null;
  qualityScore?: number | null;
  repairAttempted: boolean;
  repairSuccessful?: boolean | null;
  validationStartTime?: string | null;
  validationEndTime?: string | null;
  validationDuration?: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationFilterParams extends PaginationParams {
  workspaceId: string;
  status?: AiResponseValidationStatus;
  capability?: string;
  modelProvider?: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
}

export type ValidationListResult = PaginatedResult<AiResponseValidation>;

export interface AiResponseValidationResultEntry {
  id: string;
  validationId: string;
  validationType: AiResponseValidationType;
  validatorName: string;
  passed: boolean;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  createdAt: string;
}

export interface ValidatorConfig {
  id: string;
  workspaceId?: string | null;
  name: string;
  validationType: string;
  capability?: string | null;
  useCase?: string | null;
  agentType?: string | null;
  modelProvider?: string | null;
  enabled: boolean;
  priority: number;
  stopOnFailure: boolean;
  attemptRepair: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateValidatorConfigPayload {
  workspaceId?: string;
  name: string;
  validationType: string;
  capability?: string;
  useCase?: string;
  agentType?: string;
  modelProvider?: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  priority?: number;
  stopOnFailure?: boolean;
  attemptRepair?: boolean;
}

export type UpdateValidatorConfigPayload = Partial<Omit<CreateValidatorConfigPayload, 'workspaceId'>>;

export interface AiValidationStats {
  totalValidations: number;
  validResponses: number;
  invalidResponses: number;
  validationRate: number;
  avgConfidenceScore: number;
  avgQualityScore: number;
  avgValidationDuration: number;
}

// ── AI Guardrails (`ai-guardrails` module) ───────────────────────────────
export type GuardrailStage = 'INPUT' | 'OUTPUT' | 'TOOL_USE' | 'ACTION';
export type GuardrailCheckType = 'PATTERN_MATCH' | 'ALLOWLIST' | 'BLOCKLIST' | 'ROLE_PERMISSION' | 'TOOL_PERMISSION' | 'ACTION_LIMIT';
export type GuardrailViolationCategory = 'PROMPT_INJECTION' | 'CREDENTIAL_EXPOSURE' | 'PII_EXPOSURE' | 'FINANCIAL_DATA_EXPOSURE' | 'CUSTOMER_DATA_EXPOSURE' | 'WORKSPACE_DATA_EXPOSURE' | 'DATA_LEAKAGE' | 'UNSAFE_CONTENT' | 'POLICY_VIOLATION' | 'UNSUPPORTED_CLAIM' | 'RISKY_AUTOMATION' | 'ALLOWLIST_VIOLATION' | 'BLOCKLIST_VIOLATION' | 'ROLE_PERMISSION_VIOLATION' | 'TOOL_PERMISSION_VIOLATION' | 'ACTION_LIMIT_EXCEEDED' | 'OTHER';
export type GuardrailSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GuardrailDecision = 'ALLOW' | 'WARN' | 'REDACT' | 'BLOCK' | 'REQUIRE_REVIEW' | 'RETRY' | 'FALLBACK';
export type GuardrailOverrideScope = 'GLOBAL' | 'WORKSPACE' | 'PROVIDER' | 'MODEL';
export type GuardrailIncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type GuardrailApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface EvaluateGuardrailPayload {
  workspaceId: string;
  stage: GuardrailStage;
  content?: string;
  capability?: string;
  useCase?: string;
  modelProvider?: string;
  modelId?: string;
  toolName?: string;
  actionName?: string;
  userId?: string;
  userRole?: string;
}

export interface GuardrailEvaluationOutcome {
  evaluationId: string;
  stage: GuardrailStage;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  approvalId?: string;
  incidentId?: string;
  redactedContent?: string;
}

export interface GuardrailEvaluation {
  id: string;
  workspaceId: string;
  stage: GuardrailStage;
  status: 'COMPLETED' | 'ERROR';
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  toolName?: string | null;
  actionName?: string | null;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  createdAt: string;
}

export interface GuardrailEvaluationFilterParams extends PaginationParams {
  workspaceId: string;
  stage?: GuardrailStage;
  decision?: GuardrailDecision;
  severity?: GuardrailSeverity;
}

export type GuardrailEvaluationListResult = PaginatedResult<GuardrailEvaluation>;

export interface GuardrailEvaluationResultEntry {
  id: string;
  evaluationId: string;
  ruleId?: string | null;
  ruleName: string;
  category: GuardrailViolationCategory;
  matched: boolean;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reason: string;
  matchCount: number;
  createdAt: string;
}

export interface GuardrailRule {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  checkType: GuardrailCheckType;
  capability?: string | null;
  enabled: boolean;
  config: unknown;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  riskWeight: number;
  requiresApproval: boolean;
  priority: number;
  stopOnMatch: boolean;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuardrailRulePayload {
  workspaceId?: string;
  name: string;
  description?: string;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  checkType: GuardrailCheckType;
  capability?: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  severity?: GuardrailSeverity;
  decision?: GuardrailDecision;
  riskWeight?: number;
  requiresApproval?: boolean;
  priority?: number;
  stopOnMatch?: boolean;
}

export type UpdateGuardrailRulePayload = Partial<Omit<CreateGuardrailRulePayload, 'workspaceId'>>;

export interface GuardrailRuleFilterParams extends PaginationParams {
  workspaceId: string;
  stage?: GuardrailStage;
  category?: GuardrailViolationCategory;
  enabled?: boolean;
}

export type GuardrailRuleListResult = PaginatedResult<GuardrailRule>;

export interface GuardrailOverride {
  id: string;
  scope: GuardrailOverrideScope;
  ruleId?: string | null;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  enabledOverride?: boolean | null;
  decisionOverride?: GuardrailDecision | null;
  severityOverride?: GuardrailSeverity | null;
  priority: number;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuardrailOverridePayload {
  scope: GuardrailOverrideScope;
  ruleId?: string;
  workspaceId?: string;
  providerKey?: string;
  modelId?: string;
  enabledOverride?: boolean;
  decisionOverride?: GuardrailDecision;
  severityOverride?: GuardrailSeverity;
  priority?: number;
  reason?: string;
}

export type UpdateGuardrailOverridePayload = Partial<Pick<CreateGuardrailOverridePayload, 'enabledOverride' | 'decisionOverride' | 'severityOverride' | 'priority' | 'reason'>>;

export interface GuardrailOverrideFilterParams extends PaginationParams {
  workspaceId: string;
  scope?: GuardrailOverrideScope;
  ruleId?: string;
}

export type GuardrailOverrideListResult = PaginatedResult<GuardrailOverride>;

export interface GuardrailIncident {
  id: string;
  workspaceId: string;
  evaluationId?: string | null;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  status: GuardrailIncidentStatus;
  description: string;
  reportedBy?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardrailIncidentFilterParams extends PaginationParams {
  workspaceId: string;
  status?: GuardrailIncidentStatus;
  severity?: GuardrailSeverity;
  category?: GuardrailViolationCategory;
}

export type GuardrailIncidentListResult = PaginatedResult<GuardrailIncident>;

export interface UpdateGuardrailIncidentPayload {
  status: GuardrailIncidentStatus;
  assignedTo?: string;
  resolution?: string;
  performedBy?: string;
}

export interface GuardrailApproval {
  id: string;
  workspaceId: string;
  evaluationId: string;
  status: GuardrailApprovalStatus;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  reason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardrailApprovalFilterParams extends PaginationParams {
  workspaceId: string;
  status?: GuardrailApprovalStatus;
}

export type GuardrailApprovalListResult = PaginatedResult<GuardrailApproval>;

export interface DecideGuardrailApprovalPayload {
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
  decidedBy: string;
}

export interface AiGuardrailStats {
  totalEvaluations: number;
  blocked: number;
  requireReview: number;
  avgRiskScore: number;
  openIncidents: number;
  pendingApprovals: number;
}

// ── AI Decision Engine (`ai-decision-engine` module) ─────────────────────
export type AiDecisionStatus = 'PENDING' | 'EVALUATING' | 'APPROVED' | 'REJECTED' | 'REVIEW_REQUIRED' | 'DEFERRED' | 'OVERRIDDEN' | 'EXPIRED';
export type AiDecisionType = 'PRODUCT_SELECTION' | 'SUPPLIER_SELECTION' | 'PRICING' | 'REORDER' | 'MARKETPLACE' | 'INVENTORY' | 'OPERATIONAL' | 'CUSTOM';
export type AiDecisionMethod = 'RULE_BASED' | 'AI_ASSISTED' | 'WEIGHTED_SCORING' | 'HYBRID';
export type AiDecisionOutcome = 'APPROVE' | 'REJECT' | 'REVIEW_REQUIRED' | 'DEFERRED';
export type AiDecisionOverrideReason = 'BUSINESS_JUDGMENT' | 'INCORRECT_DATA' | 'CHANGED_REQUIREMENTS' | 'EMERGENCY' | 'POLICY_EXCEPTION' | 'OTHER';

export interface DecisionRisk {
  type: string;
  severity: string;
  description: string;
  mitigation?: string;
}

export interface DecisionAlternative {
  candidateId: string;
  score: number;
  reason: string;
}

export interface DecisionCandidate {
  id: string;
  candidateData: unknown;
  candidateLabel?: string;
  score?: number;
  selected: boolean;
  rank?: number;
}

export interface EvaluateDecisionPayload {
  workspaceId: string;
  decisionType: AiDecisionType;
  decisionMethod: AiDecisionMethod;
  inputSnapshot: unknown;
  candidates: unknown[];
  capability?: string;
  useCase?: string;
  context?: string;
}

export interface DecisionResult {
  decisionId: string;
  status: AiDecisionStatus;
  outcome?: AiDecisionOutcome;
  selectedCandidate?: DecisionCandidate;
  finalScore?: number;
  confidenceScore?: number;
  rationale?: string;
  risks: DecisionRisk[];
  alternatives: DecisionAlternative[];
}

export interface AiDecision {
  id: string;
  workspaceId: string;
  status: AiDecisionStatus;
  decisionType: AiDecisionType;
  decisionMethod: AiDecisionMethod;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  context?: string | null;
  outcome?: AiDecisionOutcome | null;
  selectedCandidateId?: string | null;
  finalScore?: number | null;
  confidenceScore?: number | null;
  rationale?: string | null;
  risks: DecisionRisk[];
  alternatives: DecisionAlternative[];
  modelProvider?: string | null;
  modelName?: string | null;
  requiresHumanApproval: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DecisionFilterParams extends PaginationParams {
  workspaceId: string;
  status?: AiDecisionStatus;
  decisionType?: AiDecisionType;
  capability?: string;
}

export type DecisionListResult = PaginatedResult<AiDecision>;

export interface ApproveDecisionPayload {
  workspaceId: string;
  approvedBy: string;
  reason?: string;
}

export interface RejectDecisionPayload {
  workspaceId: string;
  rejectedBy: string;
  reason?: string;
}

export interface ReviewDecisionPayload {
  workspaceId: string;
  reviewedBy: string;
  notes?: string;
}

export interface OverrideDecisionPayload {
  workspaceId: string;
  overrideReason: AiDecisionOverrideReason;
  reasonText?: string;
  newOutcome: AiDecisionOutcome;
  newCandidateId?: string;
  overriddenBy: string;
}

export interface DecisionRule {
  id: string;
  workspaceId?: string | null;
  name: string;
  decisionType: string;
  method: string;
  capability?: string | null;
  priority: number;
  enabled: boolean;
  requiresApproval: boolean;
  approvalThreshold?: number | null;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDecisionRulePayload {
  workspaceId?: string;
  name: string;
  decisionType: string;
  method: string;
  capability?: string;
  useCase?: string;
  ruleConfig: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  requiresApproval?: boolean;
  approvalThreshold?: number;
  version?: string;
}

export type UpdateDecisionRulePayload = Partial<Omit<CreateDecisionRulePayload, 'workspaceId'>>;

export interface AiDecisionStats {
  totalDecisions: number;
  approvedDecisions: number;
  rejectedDecisions: number;
  approvalRate: number;
  avgFinalScore: number;
  avgConfidenceScore: number;
  avgEvaluationDuration: number;
}

// ── AI Recommendation Engine (`ai-recommendation-engine` module) ─────────
export type AiRecommendationStatus = 'PENDING' | 'GENERATING' | 'READY' | 'ACCEPTED' | 'REJECTED' | 'DISMISSED' | 'DEFERRED' | 'EXPIRED';
export type AiRecommendationType = 'PRODUCT' | 'SUPPLIER' | 'PRICING' | 'REORDER' | 'MARKETPLACE' | 'INVENTORY' | 'OPERATIONAL' | 'CUSTOM';
export type AiRecommendationStrategyType = 'WEIGHTED' | 'RULE_BASED' | 'AI_ASSISTED' | 'HYBRID';
export type AiRecommendationFeedbackType = 'ACCEPT' | 'REJECT' | 'DISMISS' | 'DEFER' | 'HELPFUL' | 'NOT_HELPFUL';

export interface RecommendationItem {
  id: string;
  itemData: unknown;
  itemLabel?: string;
  itemType?: string;
  rank: number;
  score: number;
  selected: boolean;
  rationale?: string;
}

export interface GenerateRecommendationPayload {
  workspaceId: string;
  recommendationType: AiRecommendationType;
  strategy: AiRecommendationStrategyType;
  inputSnapshot: unknown;
  candidates: unknown[];
  userId?: string;
  personalized?: boolean;
  capability?: string;
  useCase?: string;
  context?: string;
}

export interface RecommendationResult {
  recommendationId: string;
  status: AiRecommendationStatus;
  items: RecommendationItem[];
  overallScore?: number;
  confidenceScore?: number;
  rationale?: string;
  risks: DecisionRisk[];
  alternatives: { itemId: string; rank: number; score: number; reason: string }[];
}

export interface AiRecommendation {
  id: string;
  workspaceId: string;
  status: AiRecommendationStatus;
  recommendationType: AiRecommendationType;
  strategy: AiRecommendationStrategyType;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  decisionId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  context?: string | null;
  userId?: string | null;
  personalized: boolean;
  overallScore?: number | null;
  confidenceScore?: number | null;
  rationale?: string | null;
  risks: DecisionRisk[];
  modelProvider?: string | null;
  modelName?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationFilterParams extends PaginationParams {
  workspaceId: string;
  status?: AiRecommendationStatus;
  recommendationType?: AiRecommendationType;
  userId?: string;
  capability?: string;
}

export type RecommendationListResult = PaginatedResult<AiRecommendation>;

export interface AcceptRecommendationPayload {
  workspaceId: string;
  acceptedBy: string;
  itemId?: string;
  reason?: string;
}

export interface RejectRecommendationPayload {
  workspaceId: string;
  rejectedBy: string;
  reason?: string;
}

export interface DismissRecommendationPayload {
  workspaceId: string;
  dismissedBy: string;
  reason?: string;
}

export interface DeferRecommendationPayload {
  workspaceId: string;
  deferredBy: string;
  reason?: string;
}

export interface SubmitRecommendationFeedbackPayload {
  workspaceId: string;
  feedbackType: AiRecommendationFeedbackType;
  itemId?: string;
  userId: string;
  rating?: number;
  comment?: string;
}

export interface RecommendationFeedback {
  id: string;
  recommendationId: string;
  feedbackType: AiRecommendationFeedbackType;
  itemId?: string | null;
  userId: string;
  rating?: number | null;
  comment?: string | null;
  createdAt: string;
}

export interface TrackRecommendationOutcomePayload {
  workspaceId: string;
  itemId?: string;
  outcomeType: string;
  success: boolean;
  effectivenessScore?: number;
  notes?: string;
}

export interface RecommendationOutcome {
  id: string;
  recommendationId: string;
  itemId?: string | null;
  outcomeType: string;
  success: boolean;
  effectivenessScore?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface RecommendationStrategyConfig {
  id: string;
  workspaceId?: string | null;
  name: string;
  recommendationType: string;
  strategy: string;
  capability?: string | null;
  priority: number;
  enabled: boolean;
  personalizationEnabled: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecommendationStrategyPayload {
  workspaceId?: string;
  name: string;
  recommendationType: string;
  strategy: string;
  capability?: string;
  useCase?: string;
  strategyConfig: Record<string, unknown>;
  priority?: number;
  enabled?: boolean;
  personalizationEnabled?: boolean;
  version?: string;
}

export type UpdateRecommendationStrategyPayload = Partial<Omit<CreateRecommendationStrategyPayload, 'workspaceId'>>;

export interface AiRecommendationStats {
  totalRecommendations: number;
  acceptedRecommendations: number;
  acceptanceRate: number;
  avgOverallScore: number;
  avgConfidenceScore: number;
  avgGenerationDuration: number;
}

// ── AI Cost Tracking (`ai-cost-tracking` module) ─────────────────────────
export type AiCostRecordStatus = 'SUCCESS' | 'FAILED';
export type AiCostBudgetScope = 'WORKSPACE' | 'FEATURE' | 'PROJECT';
export type AiCostBudgetPeriod = 'DAILY' | 'MONTHLY';
export type AiCostBudgetAlertType = 'WARNING' | 'EXCEEDED';
export type CostSummaryGroupByField = 'providerKey' | 'modelKey' | 'capability' | 'feature' | 'projectId' | 'userId' | 'agentId' | 'workflowId' | 'jobId';

export interface EstimateAiCostPayload {
  workspaceId: string;
  providerKey: string;
  modelKey?: string;
  capability?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  imageUnits?: number;
  embeddingUnits?: number;
}

export interface EstimateCostResult {
  cost: number;
  currency: string;
  pricingConfigId: string;
  pricingVersion: number;
}

export interface AiCostRecord {
  id: string;
  workspaceId: string;
  orchestratorRequestId?: string | null;
  agentId?: string | null;
  agentExecutionId?: string | null;
  workflowId?: string | null;
  workflowExecutionId?: string | null;
  jobId?: string | null;
  jobExecutionId?: string | null;
  providerKey: string;
  modelKey?: string | null;
  capability?: string | null;
  useCase?: string | null;
  feature?: string | null;
  projectId?: string | null;
  userId?: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  imageUnits: number;
  embeddingUnits: number;
  requestCount: number;
  latencyMs?: number | null;
  currency: string;
  estimatedCost?: number | null;
  finalCost?: number | null;
  status: AiCostRecordStatus;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  isDuplicate: boolean;
  createdAt: string;
}

export interface AiCostRecordFilterParams extends PaginationParams {
  workspaceId: string;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  feature?: string;
  projectId?: string;
  userId?: string;
  status?: AiCostRecordStatus;
  startDate?: string;
  endDate?: string;
}

export type AiCostRecordListResult = PaginatedResult<AiCostRecord>;

export interface CostSummaryFilterParams {
  workspaceId: string;
  startDate?: string;
  endDate?: string;
  groupBy?: CostSummaryGroupByField;
}

export interface CostSummaryGroup {
  key: string | null;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export interface AiCostSummary {
  workspaceId: string;
  totalCost: number;
  totalEstimatedCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  totalRequests: number;
  failedRequests: number;
  retriedRequests: number;
  fallbackRequests: number;
  duplicateSpend: number;
  averageLatencyMs: number;
  groups?: CostSummaryGroup[];
}

export interface AiCostPricingConfig {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  modelKey?: string | null;
  capability?: string | null;
  currency: string;
  inputPricePer1k?: number | null;
  outputPricePer1k?: number | null;
  cachedInputPricePer1k?: number | null;
  imagePriceUnit?: number | null;
  embeddingPricePer1k?: number | null;
  enabled: boolean;
  priority: number;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostPricingConfigPayload {
  workspaceId?: string;
  providerKey: string;
  modelKey?: string;
  capability?: string;
  currency?: string;
  inputPricePer1k?: number;
  outputPricePer1k?: number;
  cachedInputPricePer1k?: number;
  imagePriceUnit?: number;
  embeddingPricePer1k?: number;
  enabled?: boolean;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export type UpdateCostPricingConfigPayload = Partial<Omit<CreateCostPricingConfigPayload, 'workspaceId' | 'providerKey'>> & { changeReason?: string };

export interface CostPricingConfigFilterParams extends PaginationParams {
  workspaceId: string;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  enabled?: boolean;
}

export type CostPricingConfigListResult = PaginatedResult<AiCostPricingConfig>;

export interface AiCostBudget {
  id: string;
  workspaceId: string;
  scope: AiCostBudgetScope;
  period: AiCostBudgetPeriod;
  name: string;
  feature?: string | null;
  projectId?: string | null;
  limitAmount: number;
  currency: string;
  warningThresholdPercent: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostBudgetPayload {
  workspaceId: string;
  scope: AiCostBudgetScope;
  period: AiCostBudgetPeriod;
  name: string;
  feature?: string;
  projectId?: string;
  limitAmount: number;
  currency?: string;
  warningThresholdPercent?: number;
  enabled?: boolean;
}

export type UpdateCostBudgetPayload = Partial<Omit<CreateCostBudgetPayload, 'workspaceId' | 'scope' | 'period'>>;

export interface CostBudgetFilterParams extends PaginationParams {
  workspaceId: string;
  scope?: AiCostBudgetScope;
  period?: AiCostBudgetPeriod;
}

export type CostBudgetListResult = PaginatedResult<AiCostBudget>;

export interface AiCostBudgetAlert {
  id: string;
  budgetId: string;
  periodKey: string;
  type: AiCostBudgetAlertType;
  spendAmount: number;
  limitAmount: number;
  currency: string;
  createdAt: string;
}

// ── AI Usage Tracking (`ai-usage-tracking` module) ───────────────────────
export type AiUsageSource = 'PROVIDER_REPORTED' | 'ESTIMATED';
export type AiUsageRecordStatus = 'SUCCESS' | 'FAILED';
export type AiUsageQuotaScope = 'WORKSPACE' | 'FEATURE' | 'PROJECT';
export type AiUsageQuotaPeriod = 'HOURLY' | 'DAILY' | 'MONTHLY';
export type AiUsageQuotaUnit = 'REQUESTS' | 'TOKENS' | 'IMAGES' | 'EMBEDDINGS' | 'AUDIO' | 'TOOL_CALLS';
export type UsageBucketGranularity = 'HOUR' | 'DAY' | 'MONTH';
export type UsageSummaryGroupByField = 'providerKey' | 'modelKey' | 'capability' | 'feature' | 'projectId' | 'userId' | 'agentId' | 'workflowId' | 'jobId';

export interface AiUsageRecord {
  id: string;
  workspaceId: string;
  providerKey: string;
  modelKey?: string | null;
  capability?: string | null;
  feature?: string | null;
  projectId?: string | null;
  userId?: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  imageUnits: number;
  embeddingUnits: number;
  audioUnits: number;
  toolCalls: number;
  requestCount: number;
  retryCount: number;
  fallbackCount: number;
  latencyMs?: number | null;
  status: AiUsageRecordStatus;
  source: AiUsageSource;
  createdAt: string;
}

export interface AiUsageRecordFilterParams extends PaginationParams {
  workspaceId: string;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  feature?: string;
  userId?: string;
  status?: AiUsageRecordStatus;
  source?: AiUsageSource;
  startDate?: string;
  endDate?: string;
}

export type AiUsageRecordListResult = PaginatedResult<AiUsageRecord>;

export interface UsageSummaryFilterParams {
  workspaceId: string;
  startDate?: string;
  endDate?: string;
  groupBy?: UsageSummaryGroupByField;
}

export interface UsageSummaryGroup {
  key: string | null;
  totalTokens: number;
  requestCount: number;
}

export interface AiUsageSummary {
  workspaceId: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalReasoningTokens: number;
  totalCachedTokens: number;
  totalTokens: number;
  totalImageUnits: number;
  totalEmbeddingUnits: number;
  totalAudioUnits: number;
  totalToolCalls: number;
  totalRequests: number;
  totalRetries: number;
  totalFallbacks: number;
  failedRequests: number;
  averageLatencyMs: number;
  groups?: UsageSummaryGroup[];
}

export interface UsageBreakdownFilterParams {
  workspaceId: string;
  bucket: UsageBucketGranularity;
  startDate: string;
  endDate: string;
}

export interface UsageBreakdownBucket {
  bucketKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface UsageReconciliationMismatch {
  orchestratorRequestId: string;
  reason: 'MISSING_USAGE_RECORD' | 'MISSING_COST_RECORD' | 'TOKEN_MISMATCH';
  usageTotalTokens?: number;
  costTotalTokens?: number;
}

export interface UsageReconciliationResult {
  workspaceId: string;
  usageRecordCount: number;
  costRecordCount: number;
  matchedCount: number;
  mismatches: UsageReconciliationMismatch[];
}

export interface AiUsageQuota {
  id: string;
  workspaceId: string;
  scope: AiUsageQuotaScope;
  period: AiUsageQuotaPeriod;
  unit: AiUsageQuotaUnit;
  name: string;
  feature?: string | null;
  projectId?: string | null;
  limitAmount: number;
  thresholdPercent: number;
  warningThresholdPercent: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUsageQuotaPayload {
  workspaceId: string;
  scope: AiUsageQuotaScope;
  period: AiUsageQuotaPeriod;
  unit: AiUsageQuotaUnit;
  name: string;
  feature?: string;
  projectId?: string;
  limitAmount: number;
  thresholdPercent?: number;
  warningThresholdPercent?: number;
  enabled?: boolean;
}

export type UpdateUsageQuotaPayload = Partial<Omit<CreateUsageQuotaPayload, 'workspaceId' | 'scope' | 'period' | 'unit'>>;

export interface UsageQuotaFilterParams extends PaginationParams {
  workspaceId: string;
  scope?: AiUsageQuotaScope;
  period?: AiUsageQuotaPeriod;
  unit?: AiUsageQuotaUnit;
}

export type UsageQuotaListResult = PaginatedResult<AiUsageQuota>;

export interface AiUsageQuotaAlert {
  id: string;
  quotaId: string;
  periodKey: string;
  type: string;
  usageAmount: number;
  limitAmount: number;
  createdAt: string;
}

// ── AI Monitoring & Health (`ai-monitoring-health` module) ───────────────
// NOTE: health-check numbers (latency/availability/throughput) are currently generated by a
// random simulator on the backend, not measured from real provider calls — display as-is
// (it is the real API response) without implying it reflects live production telemetry.
export type AiHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE' | 'BUDGET_EXCEEDED' | 'QUOTA_EXCEEDED' | 'MAINTENANCE';
export type AiHealthCheckType = 'PROVIDER' | 'MODEL' | 'ORCHESTRATOR' | 'AGENT' | 'WORKFLOW' | 'QUEUE' | 'CACHE' | 'SYSTEM';

export interface HealthCheckRequestPayload {
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetId?: string;
  targetName: string;
  provider?: string;
  model?: string;
  capability?: string;
  isManual?: boolean;
}

export interface AiHealthCheck {
  id: string;
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetId?: string | null;
  targetName: string;
  provider?: string | null;
  model?: string | null;
  capability?: string | null;
  status: AiHealthStatus;
  previousStatus?: AiHealthStatus | null;
  availabilityPercent?: number | null;
  averageLatencyMs?: number | null;
  p95LatencyMs?: number | null;
  p99LatencyMs?: number | null;
  throughputRpm?: number | null;
  successCount: number;
  failureCount: number;
  retryCount: number;
  fallbackCount: number;
  rateLimitHits: number;
  quotaRemaining?: number | null;
  budgetRemaining?: number | null;
  totalTokensUsed: number;
  totalCost: number;
  lastCheckAt: string;
  checkDurationMs?: number | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  isManual: boolean;
  scheduledCheck: boolean;
  createdAt: string;
}

export interface AiHealthCheckFilterParams extends PaginationParams {
  workspaceId: string;
  checkType?: AiHealthCheckType;
  targetName?: string;
  provider?: string;
  model?: string;
  status?: AiHealthStatus;
  startDate?: string;
  endDate?: string;
}

export type AiHealthCheckListResult = PaginatedResult<AiHealthCheck>;

export interface AiHealthIncident {
  id: string;
  workspaceId: string;
  healthCheckId?: string | null;
  incidentType: string;
  severity: string;
  checkType: AiHealthCheckType;
  targetId?: string | null;
  targetName: string;
  provider?: string | null;
  model?: string | null;
  status: string;
  title: string;
  description: string;
  detectedAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  resolutionTime?: number | null;
  affectedRequests: number;
  failureRate?: number | null;
  rootCause?: string | null;
  resolution?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AiHealthIncidentFilterParams extends PaginationParams {
  workspaceId: string;
  checkType?: AiHealthCheckType;
  targetName?: string;
  provider?: string;
  model?: string;
  status?: string;
  severity?: string;
}

export type AiHealthIncidentListResult = PaginatedResult<AiHealthIncident>;

export interface UpdateHealthIncidentPayload {
  status?: string;
  rootCause?: string;
  resolution?: string;
}

export interface ProviderHealthSummary {
  provider: string;
  totalChecks: number;
  healthyChecks: number;
  degradedChecks: number;
  unhealthyChecks: number;
  uptimePercent: number;
  averageLatencyMs: number;
  totalRequests: number;
  successRate: number;
}

export interface ModelHealthSummary {
  provider: string;
  model: string;
  totalChecks: number;
  healthyChecks: number;
  uptimePercent: number;
  averageLatencyMs: number;
  totalRequests: number;
  successRate: number;
}

export interface WorkspaceHealthSummary {
  workspaceId: string;
  activeIncidents: number;
  periodStart?: string;
  periodEnd?: string;
}

// ── AI Audit & Activity (`ai-audit-activity` module) ──────────────────────
export type AiAuditActorType = 'USER' | 'SYSTEM' | 'SCHEDULER' | 'WEBHOOK' | 'AI_AGENT';
export type AiAuditAction = 'REQUEST_CREATED' | 'REQUEST_EXECUTED' | 'REQUEST_COMPLETED' | 'REQUEST_FAILED' | 'REQUEST_CANCELLED' | 'DECISION_EVALUATED' | 'RECOMMENDATION_GENERATED' | 'RETRY_ATTEMPTED' | 'FALLBACK_TRIGGERED' | 'GUARDRAIL_EVALUATED' | 'GUARDRAIL_BLOCKED' | 'GUARDRAIL_REDACTED' | 'COST_RECORDED' | 'USAGE_RECORDED' | 'CACHE_HIT' | 'CACHE_MISS' | 'CACHE_STORED' | 'HEALTH_CHECK_PERFORMED' | 'INCIDENT_CREATED' | 'INCIDENT_RESOLVED';
export type AiAuditOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'BLOCKED' | 'TIMEOUT' | 'CANCELLED';

export interface AiAuditLog {
  id: string;
  workspaceId: string;
  actorType: AiAuditActorType;
  actorId?: string | null;
  actorName?: string | null;
  action: AiAuditAction;
  outcome: AiAuditOutcome;
  capability?: string | null;
  useCase?: string | null;
  provider?: string | null;
  model?: string | null;
  agentId?: string | null;
  workflowId?: string | null;
  orchestratorRequestId?: string | null;
  correlationId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  latencyMs?: number | null;
  guardrailDecision?: string | null;
  guardrailReasons: string[];
  errorCode?: string | null;
  errorMessage?: string | null;
  suspicious: boolean;
  suspicionReasons: string[];
  tags: string[];
  timestamp: string;
}

export interface AiAuditLogFilterParams extends PaginationParams {
  workspaceId: string;
  actorType?: AiAuditActorType;
  actorId?: string;
  action?: AiAuditAction;
  outcome?: AiAuditOutcome;
  capability?: string;
  provider?: string;
  agentId?: string;
  workflowId?: string;
  suspicious?: boolean;
  startDate?: string;
  endDate?: string;
}

export type AiAuditLogListResult = PaginatedResult<AiAuditLog>;

export interface AiAuditTimelineParams {
  workspaceId: string;
  entityType: 'agent' | 'workflow' | 'orchestratorRequest' | 'user';
  entityId: string;
  startDate?: string;
  endDate?: string;
}

export interface AiAuditStats {
  totalActivities: number;
  successCount: number;
  failureCount: number;
  blockedCount: number;
  suspiciousCount: number;
  totalTokens: number;
  totalCost: number;
  successRate: number;
}

// ── Forecasting Engine (`forecasting-engine` module) ──────────────────────
// NOTE: forecast generation and backtesting are currently backend stubs (random values,
// not real time-series math, and results are not persisted for later retrieval) — render
// whatever the API returns honestly; do not imply these numbers are analytically derived.
export type ForecastType = 'demand' | 'sales' | 'revenue' | 'profit' | 'inventory' | 'reorder' | 'procurement' | 'capacity';
export type ForecastScope = 'product' | 'sku' | 'variant' | 'category' | 'supplier' | 'marketplace' | 'account' | 'warehouse' | 'country' | 'region';
export type ForecastHorizon = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ForecastStrategy = 'moving_average' | 'exponential_smoothing' | 'seasonal_decomposition' | 'trend_projection' | 'ml_regression' | 'ensemble';
export type ForecastStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale';
export type ForecastTrigger = 'manual' | 'scheduled' | 'event' | 'bulk';

export interface ForecastDefinition {
  id: string;
  workspaceId: string;
  definitionKey: string;
  name: string;
  description?: string | null;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  horizon: ForecastHorizon;
  periodsAhead: number;
  historicalPeriods: number;
  includeSeasonality: boolean;
  includeTrends: boolean;
  includePromotions: boolean;
  includeExternalSignals: boolean;
  confidenceLevel: number;
  autoRefresh: boolean;
  refreshIntervalHours?: number | null;
  accuracyThreshold?: number | null;
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateForecastDefinitionPayload {
  workspaceId: string;
  definitionKey: string;
  name: string;
  description?: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  horizon: ForecastHorizon;
  periodsAhead: number;
  historicalPeriods: number;
  includeSeasonality?: boolean;
  includeTrends?: boolean;
  includePromotions?: boolean;
  includeExternalSignals?: boolean;
  confidenceLevel?: number;
  autoRefresh?: boolean;
  refreshIntervalHours?: number;
  accuracyThreshold?: number;
  enabled?: boolean;
}

export type UpdateForecastDefinitionPayload = Partial<Omit<CreateForecastDefinitionPayload, 'workspaceId' | 'definitionKey' | 'forecastType' | 'scope' | 'scopeId'>>;

export interface ForecastDefinitionFilterParams extends PaginationParams {
  workspaceId: string;
  forecastType?: ForecastType;
  scope?: ForecastScope;
  scopeId?: string;
  strategy?: ForecastStrategy;
  enabled?: boolean;
}

export type ForecastDefinitionListResult = PaginatedResult<ForecastDefinition>;

export interface GenerateForecastPayload {
  definitionId: string;
  workspaceId: string;
  trigger?: ForecastTrigger;
  forceRefresh?: boolean;
}

export interface ForecastExecution {
  id: string;
  definitionId: string;
  workspaceId: string;
  definitionKey: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  status: ForecastStatus;
  trigger: ForecastTrigger;
  forecastStart: string;
  forecastEnd: string;
  startedAt?: string | null;
  completedAt?: string | null;
  duration?: number | null;
  dataPointsUsed?: number | null;
  dataQualityScore?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ForecastExecutionFilterParams extends PaginationParams {
  workspaceId: string;
  definitionId?: string;
  status?: ForecastStatus;
  trigger?: ForecastTrigger;
}

export type ForecastExecutionListResult = PaginatedResult<ForecastExecution>;

export interface ForecastDataPoint {
  period: string;
  value: number;
  lowerBound?: number;
  upperBound?: number;
  confidence: number;
}

export interface ForecastAssumptions {
  seasonalityDetected: boolean;
  trendDirection?: 'up' | 'down' | 'stable';
  outlierCount?: number;
  missingDataPercentage?: number;
}

export interface ForecastDataQuality {
  completeness: number;
  consistency: number;
  reliability: number;
  overallScore: number;
}

export interface ForecastResult {
  id: string;
  executionId: string;
  definitionId: string;
  workspaceId: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  horizon: ForecastHorizon;
  generatedAt: string;
  dataPoints: ForecastDataPoint[];
  assumptions: ForecastAssumptions;
  dataQuality: ForecastDataQuality;
  version: number;
  createdAt: string;
}

export interface BacktestForecastPayload {
  definitionId: string;
  workspaceId: string;
  testPeriodStart: string;
  testPeriodEnd: string;
}

export interface BacktestMetrics {
  mae: number;
  mape: number;
  rmse: number;
  accuracy: number;
}

export interface BacktestResult {
  id: string;
  definitionId: string;
  executionId: string;
  workspaceId: string;
  testPeriodStart: string;
  testPeriodEnd: string;
  strategy: ForecastStrategy;
  metrics: BacktestMetrics;
  createdAt: string;
}

// ── Business Insights (`business-insights` module) ────────────────────────
// NOTE: insight generation is currently a backend stub (fabricated/random evidence and
// impact values, not real business analysis) and the repository is non-persistent —
// render honestly, expect lists to often come back empty regardless of what was generated.
export type InsightDomain = 'product' | 'supplier' | 'procurement' | 'pricing' | 'marketplace' | 'inventory' | 'warehouse' | 'sales' | 'profit' | 'ai';
export type InsightType = 'trend' | 'risk' | 'opportunity' | 'exception' | 'root_cause' | 'performance_gap';
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'reviewed' | 'accepted' | 'dismissed' | 'resolved' | 'expired';
export type InsightStrategy = 'rule_based' | 'analytics_based' | 'ai_assisted' | 'hybrid';

export interface InsightEvidence {
  sourceType: string;
  sourceId: string;
  metric?: string;
  value: unknown;
  threshold?: number;
  deviation?: number;
  timestamp: string;
}

export interface InsightImpact {
  revenue?: number;
  cost?: number;
  margin?: number;
  quantity?: number;
  customMetrics?: Record<string, number>;
}

export interface RecommendedAction {
  title: string;
  description: string;
  targetModule: string;
  actionType: string;
  parameters?: Record<string, unknown>;
}

export interface AffectedEntity {
  entityType: string;
  entityId: string;
  entityName?: string;
}

export interface BusinessInsight {
  id: string;
  workspaceId: string;
  insightKey: string;
  domain: InsightDomain;
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  strategy: InsightStrategy;
  title: string;
  summary: string;
  evidence: InsightEvidence[];
  impact?: InsightImpact;
  confidence: number;
  recommendedActions: RecommendedAction[];
  affectedEntities: AffectedEntity[];
  version: number;
  validUntil?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  dismissedBy?: string | null;
  dismissedAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  feedback?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
  actionReferences?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateInsightPayload {
  workspaceId: string;
  domain: InsightDomain;
  type: InsightType;
  strategy?: InsightStrategy;
  sourceIds?: string[];
  context?: Record<string, unknown>;
  userId?: string;
}

export interface InsightFilterParams extends PaginationParams {
  workspaceId: string;
  domain?: InsightDomain;
  type?: InsightType;
  priority?: InsightPriority;
  status?: InsightStatus;
  strategy?: InsightStrategy;
  ownerId?: string;
}

export type InsightListResult = PaginatedResult<BusinessInsight>;

export interface ReviewInsightPayload {
  insightId: string;
  workspaceId: string;
  feedback?: string;
  reviewedBy?: string;
}

export interface AcceptInsightPayload {
  insightId: string;
  workspaceId: string;
  ownerId?: string;
  dueDate?: string;
  acceptedBy?: string;
}

export interface DismissInsightPayload {
  insightId: string;
  workspaceId: string;
  reason?: string;
  dismissedBy?: string;
}

export interface ResolveInsightPayload {
  insightId: string;
  workspaceId: string;
  actionReferences?: string[];
  resolvedBy?: string;
}

export interface ChangeInsightPriorityPayload {
  insightId: string;
  workspaceId: string;
  newPriority: InsightPriority;
  reason?: string;
  changedBy?: string;
}

export interface RecordInsightOutcomePayload {
  insightId: string;
  workspaceId: string;
  actualImpact?: InsightImpact;
  actionsTaken: string[];
  resultSummary: string;
  successRate?: number;
  recordedBy?: string;
}

export interface InsightOutcome {
  id: string;
  insightId: string;
  actualImpact?: InsightImpact;
  actionsTaken: string[];
  resultSummary: string;
  successRate?: number | null;
  recordedBy?: string | null;
  recordedAt: string;
}

export interface InsightHistoryEntry {
  id: string;
  insightId: string;
  version: number;
  previousStatus: InsightStatus;
  newStatus: InsightStatus;
  previousPriority?: InsightPriority;
  newPriority?: InsightPriority;
  changeReason?: string | null;
  changedBy?: string | null;
  changedAt: string;
}

export interface InsightHistoryFilterParams extends PaginationParams {
  workspaceId: string;
  insightId?: string;
  startDate?: string;
  endDate?: string;
}

export type InsightHistoryListResult = PaginatedResult<InsightHistoryEntry>;

// ── KPI Management (`kpi-management` module) ──────────────────────────────
export type KpiScope = 'system' | 'workspace' | 'custom';
export type KpiCategory = 'product' | 'supplier' | 'procurement' | 'inventory' | 'warehouse' | 'marketplace' | 'sales' | 'profit' | 'ai' | 'custom';
export type KpiStatus = 'draft' | 'active' | 'disabled' | 'archived';
export type KpiHealthStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
export type KpiTrendDirection = 'up' | 'down' | 'stable' | 'unknown';
export type KpiAggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'median' | 'percentile' | 'custom';
export type KpiComparisonPeriod = 'previous_period' | 'same_period_last_year' | 'same_period_last_month' | 'custom';
export type KpiThresholdOperator = 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'equals' | 'not_equals' | 'between' | 'outside';

export interface KpiFormula {
  expression: string;
  variables: Record<string, string>;
  description?: string;
}

export interface KpiDimension {
  dimensionKey: string;
  values?: string[];
  isRequired: boolean;
}

export interface KpiMetric {
  metricKey: string;
  aggregation?: KpiAggregationType;
  weight?: number;
}

export interface KpiTarget {
  value: number;
  period: string;
  startDate?: string;
  endDate?: string;
}

export interface KpiThreshold {
  name: string;
  operator: KpiThresholdOperator;
  value: number;
  value2?: number;
  healthStatus: KpiHealthStatus;
  alertEnabled: boolean;
  alertSeverity?: string;
}

export interface KpiDefinition {
  id: string;
  workspaceId?: string | null;
  kpiKey: string;
  name: string;
  description?: string | null;
  scope: KpiScope;
  category: KpiCategory;
  status: KpiStatus;
  version: number;
  formula?: KpiFormula;
  dimensions?: KpiDimension[];
  metrics?: KpiMetric[];
  target?: KpiTarget;
  thresholds?: KpiThreshold[];
  unit?: string | null;
  aggregation: KpiAggregationType;
  comparisonPeriod?: KpiComparisonPeriod;
  drillDownEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes?: number | null;
  groupKey?: string | null;
  ownerId?: string | null;
  isSystem: boolean;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface CreateKpiDefinitionPayload {
  workspaceId?: string;
  kpiKey: string;
  name: string;
  description?: string;
  scope: KpiScope;
  category: KpiCategory;
  formula?: KpiFormula;
  dimensions?: KpiDimension[];
  metrics?: KpiMetric[];
  target?: KpiTarget;
  thresholds?: KpiThreshold[];
  unit?: string;
  aggregation: KpiAggregationType;
  comparisonPeriod?: KpiComparisonPeriod;
  drillDownEnabled?: boolean;
  cacheEnabled?: boolean;
  cacheTtlMinutes?: number;
  groupKey?: string;
  ownerId?: string;
  createdBy: string;
}

export type UpdateKpiDefinitionPayload = Partial<Omit<CreateKpiDefinitionPayload, 'workspaceId' | 'kpiKey' | 'scope' | 'category' | 'createdBy'>> & { updatedBy: string };

export interface KpiDefinitionFilterParams extends PaginationParams {
  workspaceId?: string;
  scope?: KpiScope;
  category?: KpiCategory;
  status?: KpiStatus;
  groupKey?: string;
  ownerId?: string;
}

export interface KpiDefinitionListResult {
  definitions: KpiDefinition[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CalculateKpiPayload {
  kpiDefinitionId: string;
  workspaceId: string;
  periodStart: string;
  periodEnd: string;
  dimensions?: Record<string, unknown>;
  forceRecalculate?: boolean;
}

export interface KpiCalculationResult {
  kpiDefinitionId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  calculatedAt: string;
}

export interface CreateKpiSnapshotPayload {
  kpiDefinitionId: string;
  workspaceId: string;
  snapshotKey: string;
  periodStart: string;
  periodEnd: string;
}

export interface KpiValue {
  id: string;
  kpiDefinitionId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  calculatedAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface KpiSnapshot {
  id: string;
  kpiDefinitionId: string;
  kpiKey: string;
  snapshotKey: string;
  values: KpiValue[];
  aggregatedValue: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface KpiVersion {
  id: string;
  kpiDefinitionId: string;
  version: number;
  definition: Partial<KpiDefinition>;
  changeDescription?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface KpiHistoryEntry {
  id: string;
  kpiDefinitionId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  recordedAt: string;
  periodStart: string;
  periodEnd: string;
}

export interface KpiGroup {
  id: string;
  workspaceId?: string | null;
  groupKey: string;
  name: string;
  description?: string | null;
  category?: KpiCategory | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKpiGroupPayload {
  workspaceId?: string;
  groupKey: string;
  name: string;
  description?: string;
  category?: KpiCategory;
}

export type UpdateKpiGroupPayload = Partial<Pick<CreateKpiGroupPayload, 'name' | 'description' | 'category'>>;

export interface KpiAlert {
  id: string;
  kpiDefinitionId: string;
  kpiKey: string;
  thresholdName: string;
  severity: string;
  value: number;
  thresholdValue: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
}

// ── API Key Management (`api-key-management` module) ──────────────────────
// NOTE: the plaintext key is returned exactly once (create/rotate) and never again —
// never persist it client-side beyond the reveal-once dialog's local component state.
export type ApiKeyScopeType = 'ORGANIZATION' | 'WORKSPACE' | 'USER' | 'SERVICE_ACCOUNT';
export type ApiKeyStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';

export interface ApiKey {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: ApiKeyScopeType;
  name: string;
  description: string | null;
  ownerUserId: string | null;
  serviceAccountHandle: string | null;
  keyId: string;
  status: ApiKeyStatus;
  scopes: string[];
  permissions: string[];
  environments: string[];
  ipAllowlist: string[];
  rateLimitPerMinute: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  lastUsedIp: string | null;
  rotatedFromId: string | null;
  rotatedToId: string | null;
  gracePeriodEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyPayload {
  name: string;
  description?: string;
  scopeType: ApiKeyScopeType;
  organizationId?: string;
  ownerUserId?: string;
  serviceAccountHandle?: string;
  scopes?: string[];
  permissions?: string[];
  environments?: string[];
  ipAllowlist?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: string;
}

export type UpdateApiKeyPayload = Partial<Pick<CreateApiKeyPayload, 'name' | 'description' | 'scopes' | 'permissions' | 'environments' | 'ipAllowlist' | 'rateLimitPerMinute' | 'expiresAt'>>;

export interface ApiKeyFilterParams extends PaginationParams {
  scopeType?: ApiKeyScopeType;
  status?: ApiKeyStatus;
  search?: string;
}

export type ApiKeyListResult = PaginatedResult<ApiKey>;

export interface ApiKeyCreatedSecret {
  apiKey: ApiKey;
  plaintextKey: string;
}

export interface ApiKeyHistoryEntry {
  id: string;
  apiKeyId: string;
  changeType: string;
  fromStatus: ApiKeyStatus | null;
  toStatus: ApiKeyStatus | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

// ── Webhook Framework (`webhook-framework` module) ─────────────────────────
export type WebhookScopeType = 'ORGANIZATION' | 'WORKSPACE';
export type WebhookEndpointStatus = 'ACTIVE' | 'DISABLED';
export type WebhookHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type WebhookDeliveryStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'RETRYING' | 'DEAD_LETTERED' | 'CANCELLED';

export interface WebhookEndpoint {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: WebhookScopeType;
  name: string;
  description: string | null;
  url: string;
  eventTypes: string[];
  headers: Record<string, string> | null;
  payloadVersion: string;
  status: WebhookEndpointStatus;
  healthStatus: WebhookHealthStatus;
  retryMaxAttempts: number;
  retryBackoffMs: number;
  consecutiveFailures: number;
  lastDeliveryAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookPayload {
  name: string;
  description?: string;
  scopeType: WebhookScopeType;
  organizationId?: string;
  url: string;
  eventTypes: string[];
  headers?: Record<string, string>;
  retryMaxAttempts?: number;
  retryBackoffMs?: number;
}

export type UpdateWebhookPayload = Partial<Pick<CreateWebhookPayload, 'name' | 'description' | 'url' | 'eventTypes' | 'headers' | 'retryMaxAttempts' | 'retryBackoffMs'>>;

export interface WebhookFilterParams extends PaginationParams {
  scopeType?: WebhookScopeType;
  status?: WebhookEndpointStatus;
  healthStatus?: WebhookHealthStatus;
  search?: string;
}

export type WebhookListResult = PaginatedResult<WebhookEndpoint>;

export interface WebhookEndpointCreatedSecret {
  endpoint: WebhookEndpoint;
  plaintextSecret: string;
}

export interface WebhookHistoryEntry {
  id: string;
  endpointId: string;
  changeType: string;
  fromStatus: WebhookEndpointStatus | null;
  toStatus: WebhookEndpointStatus | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  eventId: string;
  payloadVersion: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  latencyMs: number | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryFilterParams extends PaginationParams {
  status?: WebhookDeliveryStatus;
  eventType?: string;
}

export type WebhookDeliveryListResult = PaginatedResult<WebhookDelivery>;

export interface TestWebhookPayload {
  eventType?: string;
  payload?: Record<string, unknown>;
}

export interface WebhookTestResult {
  success: boolean;
  responseStatus?: number;
  latencyMs?: number;
  error?: string;
}

// ── OAuth Management (`oauth-management` module) ───────────────────────────
export type OAuthScopeType = 'ORGANIZATION' | 'WORKSPACE' | 'USER' | 'SERVICE_ACCOUNT';
export type OAuthGrantType = 'AUTHORIZATION_CODE' | 'CLIENT_CREDENTIALS';
export type OAuthClientStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'ARCHIVED';
export type OAuthConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'DISCONNECTED';

export interface OAuthClient {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  name: string;
  description: string | null;
  providerKey: string;
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: string[];
  environment: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | null;
  userInfoEndpoint: string | null;
  status: OAuthClientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterOAuthClientPayload {
  name: string;
  description?: string;
  scopeType: OAuthScopeType;
  organizationId?: string;
  providerKey: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  scopes?: string[];
  grantTypes: string[];
  environment?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint?: string;
  userInfoEndpoint?: string;
}

export type UpdateOAuthClientPayload = Partial<Pick<RegisterOAuthClientPayload, 'name' | 'description' | 'redirectUris' | 'scopes' | 'grantTypes' | 'environment' | 'authorizationEndpoint' | 'tokenEndpoint' | 'revocationEndpoint' | 'userInfoEndpoint'>>;

export interface OAuthClientFilterParams extends PaginationParams {
  scopeType?: OAuthScopeType;
  status?: OAuthClientStatus;
  providerKey?: string;
  search?: string;
}

export type OAuthClientListResult = PaginatedResult<OAuthClient>;

export interface OAuthConnection {
  id: string;
  clientId: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: OAuthScopeType;
  scopeKey: string;
  ownerUserId: string | null;
  serviceAccountHandle: string | null;
  providerKey: string;
  externalAccountId: string | null;
  externalAccountLabel: string | null;
  grantedScopes: string[];
  grantType: string;
  status: OAuthConnectionStatus;
  accessTokenExpiresAt: string | null;
  consentedAt: string | null;
  lastRefreshedAt: string | null;
  lastUsedAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthConnectionFilterParams extends PaginationParams {
  scopeType?: OAuthScopeType;
  status?: OAuthConnectionStatus;
  providerKey?: string;
  clientId?: string;
}

export type OAuthConnectionListResult = PaginatedResult<OAuthConnection>;

export interface AuthorizeOAuthConnectionPayload {
  scopeType: OAuthScopeType;
  organizationId?: string;
  serviceAccountHandle?: string;
  redirectUri?: string;
  scopes?: string[];
}

export interface OAuthAuthorizeResult {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface ConnectOAuthClientCredentialsPayload {
  scopeType: OAuthScopeType;
  organizationId?: string;
  serviceAccountHandle?: string;
  scopes?: string[];
}

export interface OAuthHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface OAuthConnectionTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}

// ── SSO Framework (`sso-framework` module) ──────────────────────────────────
export type SsoScopeType = 'ORGANIZATION' | 'WORKSPACE';
export type SsoProtocol = 'SAML' | 'OIDC';
export type SsoConnectionStatus = 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'ARCHIVED';
export type SsoEnforcementPolicy = 'ENFORCED' | 'OPTIONAL';

export interface SsoConnection {
  id: string;
  workspaceId: string | null;
  organizationId: string | null;
  scopeType: SsoScopeType;
  name: string;
  description: string | null;
  protocol: SsoProtocol;
  status: SsoConnectionStatus;
  enforcementPolicy: SsoEnforcementPolicy;
  domains: string[];
  scopes: string[];
  issuer: string | null;
  entityId: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  metadataFetchedAt: string | null;
  ssoUrl: string | null;
  sloUrl: string | null;
  authorizationEndpoint: string | null;
  tokenEndpoint: string | null;
  jwksUri: string | null;
  userInfoEndpoint: string | null;
  endSessionEndpoint: string | null;
  jitProvisioningEnabled: boolean;
  groupClaimName: string | null;
  defaultRoleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterSsoConnectionPayload {
  name: string;
  description?: string;
  scopeType: SsoScopeType;
  organizationId?: string;
  protocol: SsoProtocol;
  domains: string[];
  scopes?: string[];
  issuer?: string;
  entityId?: string;
  clientId?: string;
  clientSecret?: string;
  metadataUrl?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  userInfoEndpoint?: string;
  endSessionEndpoint?: string;
  jitProvisioningEnabled?: boolean;
  groupClaimName?: string;
  defaultRoleId?: string;
}

export interface UpdateSsoConnectionPayload {
  name?: string;
  description?: string;
  domains?: string[];
  scopes?: string[];
  enforcementPolicy?: SsoEnforcementPolicy;
  issuer?: string;
  entityId?: string;
  metadataUrl?: string;
  ssoUrl?: string;
  sloUrl?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  jwksUri?: string;
  userInfoEndpoint?: string;
  endSessionEndpoint?: string;
  jitProvisioningEnabled?: boolean;
  groupClaimName?: string;
  defaultRoleId?: string;
}

export interface SsoConnectionFilterParams extends PaginationParams {
  scopeType?: SsoScopeType;
  protocol?: SsoProtocol;
  status?: SsoConnectionStatus;
  search?: string;
}

export type SsoConnectionListResult = PaginatedResult<SsoConnection>;

export interface SsoHistoryEntry {
  id: string;
  connectionId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface SsoGroupRoleMapping {
  id: string;
  connectionId: string;
  externalGroup: string;
  roleId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSsoGroupRoleMappingPayload {
  externalGroup: string;
  roleId: string;
  priority?: number;
}

export type UpdateSsoGroupRoleMappingPayload = Partial<Pick<CreateSsoGroupRoleMappingPayload, 'roleId' | 'priority'>>;

export interface RotateSsoCertificatePayload {
  certificate: string;
}

export interface RotateSsoClientSecretPayload {
  clientSecret: string;
}

// ── SaaS Administration (`saas-administration` module) ────────────────────
// NOTE: every endpoint is platform-admin-gated — true ATLAS-staff only, distinct from a
// workspace OWNER/ADMIN. Cross-tenant actions here must always be visibly privileged.
export type SupportStatus = 'NONE' | 'OPEN' | 'ESCALATED' | 'RESOLVED';
export type AdminActionType =
  | 'TENANT_STATUS_CHANGE'
  | 'PLAN_ASSIGNMENT'
  | 'SUBSCRIPTION_OVERRIDE'
  | 'QUOTA_OVERRIDE'
  | 'FEATURE_OVERRIDE'
  | 'LICENSE_ACTION'
  | 'PAYMENT_ACTION'
  | 'NOTE_ADDED'
  | 'FLAG_UPDATED'
  | 'SUPPORT_STATUS_CHANGE'
  | 'IMPERSONATION_STARTED'
  | 'IMPERSONATION_ENDED';
export type ImpersonationStatus = 'ACTIVE' | 'ENDED';
/** `subscription-management`'s real enum value is `PERIOD_END` — distinct from the pre-existing (and, for this endpoint, incorrect) `PlanChangeEffective` type's `'END_OF_PERIOD'` elsewhere in this file. */
export type AdminPlanChangeEffective = 'IMMEDIATE' | 'PERIOD_END';
export type AdminSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'PAUSED' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
  createdAt: string;
}

export interface TenantFilterParams extends PaginationParams {
  status?: string;
  search?: string;
}

export type TenantListResult = PaginatedResult<TenantSummary>;

export interface TenantOverview {
  workspace: { id: string; name: string; status: string; plan: string | null };
  subscription: { id: string; status: string; planKey: string; isTrial: boolean } | null;
  billing: { outstandingBalance: number; latestPeriodStatus: string | null } | null;
  recentPaymentFailures: number;
  quotaViolations: number;
  adminProfile: TenantAdminProfile | null;
}

export interface TenantAdminProfile {
  id: string;
  workspaceId: string;
  internalFlags: string[];
  supportStatus: SupportStatus;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNote {
  id: string;
  workspaceId: string;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminActionLogEntry {
  id: string;
  actionType: string;
  targetWorkspaceId: string | null;
  targetUserId: string | null;
  performedBy: string;
  reason: string | null;
  createdAt: string;
}

export interface AdminActionLogFilterParams extends PaginationParams {
  actionType?: AdminActionType;
  targetWorkspaceId?: string;
  performedBy?: string;
}

export type AdminActionLogListResult = PaginatedResult<AdminActionLogEntry>;

export interface SuspendTenantPayload {
  reason: string;
}

export interface TerminateTenantPayload {
  reason: string;
}

export interface ActivateTenantPayload {
  reason?: string;
}

export interface AssignPlanPayload {
  planKey: string;
  changeType: PlanChangeDirection;
  effective?: AdminPlanChangeEffective;
  reason: string;
}

export interface SubscriptionOverridePayload {
  subscriptionId: string;
  toStatus: AdminSubscriptionStatus;
  reason: string;
}

export interface QuotaOverridePayload {
  resourceKey: string;
  additionalHardLimit?: number;
  reason: string;
  expiresAt?: string;
}

export interface FeatureOverridePayload {
  flagKey: string;
  enabled: boolean;
  reason: string;
}

export interface AddTenantNotePayload {
  note: string;
}

export interface UpdateInternalFlagsPayload {
  internalFlags: string[];
}

export interface UpdateSupportStatusPayload {
  supportStatus: SupportStatus;
  reason?: string;
}

export interface StartImpersonationPayload {
  targetUserId: string;
  reason: string;
}

export interface ImpersonationResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  targetUserId: string;
  targetWorkspaceId: string;
}

export interface ImpersonationSessionSummary {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetWorkspaceId: string;
  reason: string;
  ipAddress: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
}

export interface ImpersonationSessionFilterParams extends PaginationParams {
  adminUserId?: string;
  targetWorkspaceId?: string;
  status?: ImpersonationStatus;
}

export type ImpersonationSessionListResult = PaginatedResult<ImpersonationSessionSummary>;

// ── SaaS Monitoring (`saas-monitoring` module) ─────────────────────────────
export type SaasHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
export type SaasHealthCheckTrigger = 'MANUAL' | 'SCHEDULED';
export type SaasHealthIncidentStatus = 'OPEN' | 'RESOLVED';
export type SaasHealthModuleKey =
  | 'SUBSCRIPTION_MANAGEMENT'
  | 'BILLING_ENGINE'
  | 'PAYMENT_PROVIDER'
  | 'USAGE_TRACKING'
  | 'QUOTA_MANAGEMENT'
  | 'FEATURE_FLAGS'
  | 'LICENSE_MANAGEMENT'
  | 'API_KEY_MANAGEMENT'
  | 'OAUTH_MANAGEMENT'
  | 'SSO_FRAMEWORK'
  | 'WEBHOOK_FRAMEWORK'
  | 'APP_STORE'
  | 'PLUGIN_FRAMEWORK'
  | 'SAAS_ADMINISTRATION'
  | 'SAAS_AUDIT';

export interface SaasHealthIssue {
  tag: string;
  message: string;
}

export interface SaasHealthSnapshot {
  id: string;
  workspaceId: string;
  module: string;
  status: SaasHealthStatus;
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount: number;
  consecutiveDegradedChecks: number;
  consecutiveHealthyChecks: number;
  issues: SaasHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt: string;
  lastHealthyAt?: string | null;
  lastDegradedAt?: string | null;
  lastUnhealthyAt?: string | null;
}

export interface TenantHealthSummary {
  workspaceId: string;
  overallStatus: SaasHealthStatus;
  modules: SaasHealthSnapshot[];
}

export interface ModuleHealthBreakdown {
  healthy: number;
  degraded: number;
  unhealthy: number;
}

export interface PlatformHealthSummary {
  overallStatus: SaasHealthStatus;
  tenantsChecked: number;
  moduleBreakdown: Record<string, ModuleHealthBreakdown>;
}

export interface SaasHealthIncident {
  id: string;
  workspaceId: string;
  module: string;
  severity: SaasHealthStatus;
  status: SaasHealthIncidentStatus;
  triggerSummary: string;
  issues: SaasHealthIssue[];
  openedAt: string;
  resolvedAt?: string | null;
  durationMs?: number | null;
}

export interface SaasHealthIncidentFilterParams extends PaginationParams {
  module?: string;
  status?: SaasHealthIncidentStatus;
  severity?: SaasHealthStatus;
  workspaceId?: string;
}

export type SaasHealthIncidentListResult = PaginatedResult<SaasHealthIncident>;

export interface SaasHealthCheckLog {
  id: string;
  workspaceId: string;
  module: string;
  status: SaasHealthStatus;
  previousStatus?: SaasHealthStatus | null;
  trigger: SaasHealthCheckTrigger;
  queueBacklog: number;
  queueFailedCount: number;
  auditFailureCount: number;
  issues: SaasHealthIssue[];
  safeSummary?: string | null;
  checkedAt: string;
}

export interface SaasHealthCheckLogFilterParams extends PaginationParams {
  module?: string;
  workspaceId?: string;
}

export type SaasHealthCheckLogListResult = PaginatedResult<SaasHealthCheckLog>;

// ── SaaS Audit (`saas-audit` module) ───────────────────────────────────────
// NOTE: reuses the pre-existing ActivityActorType/ActivityOutcome/AuditActionCategory/AuditRiskLevel
// types defined earlier in this file (audit-logs / activity-center modules) — same enums.
export type SaasIncidentType = 'PRIVILEGE_ESCALATION' | 'DESTRUCTIVE_ACTION' | 'REPEATED_FAILURE' | 'SUSPICIOUS_CROSS_TENANT_ACCESS' | 'POLICY_VIOLATION';
export type SaasIncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type SaasAuditArchiveStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface SaasAuditTrailEntry {
  id: string;
  workspaceId: string;
  actorType: ActivityActorType;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  actionCategory: AuditActionCategory;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  outcome: ActivityOutcome;
  reason?: string | null;
  changedFields: string[];
  correlationId?: string | null;
  riskLevel: AuditRiskLevel;
  flagged: boolean;
  flagReason?: string | null;
  createdAt: string;
}

export interface SaasAuditTrailFilterParams extends PaginationParams {
  workspaceId?: string;
  organizationId?: string;
  module?: string;
  action?: string;
  actionCategory?: AuditActionCategory;
  actorType?: ActivityActorType;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  outcome?: ActivityOutcome;
  riskLevel?: AuditRiskLevel;
  flagged?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export type SaasAuditTrailListResult = PaginatedResult<SaasAuditTrailEntry>;

export interface ExportAuditTrailParams extends SaasAuditTrailFilterParams {
  format?: 'CSV' | 'JSON';
}

export interface SaasAuditExportResult {
  format: 'CSV' | 'JSON';
  count: number;
  content: string;
}

export interface SaasSecurityIncident {
  id: string;
  incidentType: SaasIncidentType;
  severity: AuditRiskLevel;
  workspaceId: string | null;
  organizationId: string | null;
  actorId: string | null;
  actorType: ActivityActorType | null;
  sourceAuditLogEntryId: string | null;
  relatedAuditLogEntryIds: string[];
  summary: string;
  detail: string | null;
  status: SaasIncidentStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasIncidentFilterParams extends PaginationParams {
  incidentType?: SaasIncidentType;
  status?: SaasIncidentStatus;
  severity?: AuditRiskLevel;
  workspaceId?: string;
  organizationId?: string;
  actorId?: string;
}

export type SaasSecurityIncidentListResult = PaginatedResult<SaasSecurityIncident>;

export interface SaasAuditReasonPayload {
  reason: string;
}

export interface SaasAuditArchive {
  id: string;
  workspaceId: string | null;
  fromDate: string;
  toDate: string;
  entryCount: number;
  format: string;
  status: SaasAuditArchiveStatus;
  requestedBy: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface CreateAuditArchivePayload {
  workspaceId?: string;
  fromDate: string;
  toDate: string;
}

export interface SaasAuditArchiveFilterParams extends PaginationParams {
  workspaceId?: string;
  status?: SaasAuditArchiveStatus;
}

export type SaasAuditArchiveListResult = PaginatedResult<SaasAuditArchive>;

export interface DetectionSweepResult {
  scanned: number;
  incidentsCreated: number;
}

export interface RetentionPurgeResult {
  workspacesPurged: number;
  entriesPurged: number;
}

// ── Tenant Analytics (`tenant-analytics` module) ───────────────────────────
// NOTE: every endpoint is platform-admin-gated.
export type TenantRiskLevel = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface TenantAnalyticsDateRangeParams {
  start?: string;
  end?: string;
}

export interface TenantGrowthMetrics {
  totalTenants: number;
  activeTenants: number;
  newTenants: number;
  churnedTenants: number;
  totalUsers: number;
}

export interface TenantRevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  currency: string;
  tenantCount: number;
}

export interface TenantChurnMetrics {
  upgrades: number;
  downgrades: number;
  cancellations: number;
  renewals: number;
  trialConversions: number;
  trialExpirations: number;
}

export interface TenantPaymentHealth {
  succeededCount: number;
  failedCount: number;
  overdueInvoiceCount: number;
  outstandingRevenue: number;
}

export interface TenantHealthSnapshot {
  workspaceId: string;
  healthScore: number;
  riskLevel: TenantRiskLevel;
  segments: string[];
  usageScore: number;
  billingScore: number;
  activityScore: number;
  supportScore: number;
  computedAt: string;
}

export interface TenantSegmentFilterParams extends PaginationParams {
  riskLevel?: TenantRiskLevel;
  segment?: string;
}

export interface TenantSegmentRow {
  workspaceId: string;
  healthScore: number;
  riskLevel: TenantRiskLevel;
  segments: string[];
}

export type TenantSegmentListResult = PaginatedResult<TenantSegmentRow>;

export interface CohortRetention {
  cohortMonth: string;
  tenantsInCohort: number;
  retentionByMonth: Record<string, number>;
}

export interface PlanComparisonRow {
  planKey: string;
  tenantCount: number;
  averageRevenue: number;
}

export interface TenantUsageBreakdownEntry {
  resourceKey?: string;
  [key: string]: unknown;
}

export interface TenantQuotaLicenseAdoption {
  resourceKey?: string;
  [key: string]: unknown;
}

export interface ExportTenantAnalyticsParams {
  report: 'growth' | 'revenue' | 'churn' | 'payment-health' | 'segments';
  format?: 'csv' | 'json';
  start?: string;
  end?: string;
}

// ── App Store (`app-store` module) ─────────────────────────────────────────
export type AppPublisherType = 'FIRST_PARTY' | 'PARTNER' | 'PRIVATE';
export type AppPricingModel = 'FREE' | 'PAID' | 'TRIAL' | 'SUBSCRIPTION';
export type AppListingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'SUSPENDED' | 'ARCHIVED' | 'REMOVED';
export type AppVersionStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'ROLLED_BACK';
export type AppInstallationStatus = 'INSTALLED' | 'ENABLED' | 'DISABLED' | 'UNINSTALLED';

export interface AppListing {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  publisherType: AppPublisherType;
  publisherName: string | null;
  publisherId: string | null;
  organizationId: string | null;
  pricingModel: AppPricingModel;
  planKey: string | null;
  regions: string[];
  permissions: string[];
  scopes: string[];
  dependencies: string[];
  featureFlagKey: string | null;
  currentVersion: string | null;
  status: AppListingStatus;
  installCount: number;
  activeTenantCount: number;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppListingFilterParams extends PaginationParams {
  publisherType?: AppPublisherType;
  pricingModel?: AppPricingModel;
  status?: AppListingStatus;
  category?: string;
  search?: string;
}

export type AppListingListResult = PaginatedResult<AppListing>;

export interface RegisterAppListingPayload {
  key: string;
  name: string;
  description?: string;
  category: string;
  publisherType: AppPublisherType;
  publisherName?: string;
  publisherId?: string;
  organizationId?: string;
  pricingModel: AppPricingModel;
  planKey?: string;
  regions?: string[];
  permissions?: string[];
  scopes?: string[];
  dependencies?: string[];
  featureFlagKey?: string;
  initialVersion: string;
}

export type UpdateAppListingPayload = Partial<Pick<RegisterAppListingPayload, 'name' | 'description' | 'category' | 'regions' | 'permissions' | 'scopes' | 'dependencies' | 'featureFlagKey'>>;

export interface AppVersion {
  id: string;
  appKey: string;
  versionString: string;
  manifest: unknown;
  status: AppVersionStatus;
  publishedAt: string | null;
  deprecatedAt: string | null;
  createdAt: string;
}

export interface PublishAppVersionPayload {
  versionString: string;
  manifest?: Record<string, unknown>;
}

export interface RollbackAppVersionPayload {
  targetVersionId: string;
  reason?: string;
}

export interface AppInstallation {
  id: string;
  appKey: string;
  versionId: string;
  workspaceId: string;
  organizationId: string | null;
  status: AppInstallationStatus;
  config: unknown;
  licenseId: string | null;
  subscriptionId: string | null;
  installedAt: string;
  enabledAt: string | null;
  disabledAt: string | null;
  uninstalledAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstallAppPayload {
  config?: Record<string, unknown>;
  credentials?: string;
}

export interface UpdateAppInstallationPayload {
  config?: Record<string, unknown>;
  credentials?: string;
}

export interface UpgradeAppPayload {
  targetVersionId?: string;
}

export interface AppInstallationFilterParams extends PaginationParams {
  status?: AppInstallationStatus;
  appKey?: string;
}

export type AppInstallationListResult = PaginatedResult<AppInstallation>;

export interface AppReview {
  id: string;
  appKey: string;
  workspaceId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface SubmitAppReviewPayload {
  rating: number;
  comment?: string;
}

export type AppReviewListResult = PaginatedResult<AppReview>;

export interface AppHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface AppHealth {
  appKey: string;
  installCount: number;
  activeTenantCount: number;
  averageRating: number;
  ratingCount: number;
}

// ── Plugin Framework (`plugin-framework` module) ───────────────────────────
export type PluginManifestStatus = 'ACTIVE' | 'DEPRECATED';
export type PluginActivationStatus = 'ACTIVE' | 'DISABLED' | 'QUARANTINED';
export type PluginExtensionPointStatus = 'ACTIVE' | 'DISABLED';
export type PluginSubscriptionStatus = 'ACTIVE' | 'DISABLED';

export interface PluginManifest {
  id: string;
  appKey: string;
  versionId: string;
  capabilities: string[];
  requiredPermissions: string[];
  requiredScopes: string[];
  hooks: string[];
  configSchema: unknown;
  minAtlasVersion: string | null;
  maxAtlasVersion: string | null;
  status: PluginManifestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPluginManifestPayload {
  versionId: string;
  capabilities?: string[];
  requiredPermissions?: string[];
  requiredScopes?: string[];
  hooks?: string[];
  configSchema?: Record<string, unknown>;
  minAtlasVersion?: string;
  maxAtlasVersion?: string;
}

export type UpdatePluginManifestPayload = Partial<Omit<RegisterPluginManifestPayload, 'versionId'>>;

export interface ActivatePluginPayload {
  grantedPermissions?: string[];
}

export interface PluginActivation {
  id: string;
  manifestId: string;
  appKey: string;
  installationId: string;
  workspaceId: string;
  status: PluginActivationStatus;
  grantedPermissions: string[];
  consecutiveFailures: number;
  lastInvokedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  quarantinedAt: string | null;
  quarantinedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PluginActivationFilterParams extends PaginationParams {
  status?: PluginActivationStatus;
  appKey?: string;
}

export type PluginActivationListResult = PaginatedResult<PluginActivation>;

export interface PluginActivationHealth {
  activationId: string;
  appKey: string;
  status: PluginActivationStatus;
  consecutiveFailures: number;
  lastInvokedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  quarantinedAt: string | null;
  quarantinedReason: string | null;
}

export interface PluginExtensionPoint {
  id: string;
  appKey: string;
  extensionPointKey: string;
  hookName: string;
  config: unknown;
  status: PluginExtensionPointStatus;
  createdAt: string;
}

export interface RegisterPluginExtensionPointPayload {
  extensionPointKey: string;
  hookName: string;
  config?: Record<string, unknown>;
}

export interface PluginEventSubscription {
  id: string;
  appKey: string;
  workspaceId: string;
  eventName: string;
  targetHook: string;
  status: PluginSubscriptionStatus;
  createdAt: string;
}

export interface CreatePluginEventSubscriptionPayload {
  eventName: string;
  targetHook: string;
}

export interface PluginHistoryEntry {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface PluginRequiredReasonPayload {
  reason: string;
}

// ── Country (`country` module) ───────────────────────────────────
export type CountryStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'DEPRECATED' | 'ARCHIVED';
export type CountryProviderDomain = 'MARKETPLACE' | 'SUPPLIER' | 'WAREHOUSE' | 'FULFILLMENT' | 'PAYMENT' | 'AI_PROVIDER';
export type CountryOverrideType = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE';
export type CountryResolutionStatus = 'RESOLVED' | 'NOT_REGISTERED' | 'DISABLED' | 'NOT_ENABLED_FOR_WORKSPACE' | 'FALLBACK_APPLIED';
export type CountryValidationIssueType =
  | 'DUPLICATE_CODE'
  | 'COUNTRY_NOT_SUPPORTED'
  | 'PROVIDER_NOT_SUPPORTED'
  | 'MARKETPLACE_NOT_SUPPORTED'
  | 'PROVIDER_DOMAIN_UNAVAILABLE'
  | 'CURRENCY_MISMATCH'
  | 'LOCALE_NOT_SUPPORTED'
  | 'TAX_REGIME_MISSING'
  | 'FEATURE_NOT_SUPPORTED'
  | 'INVALID_DEPENDENCY';

export interface Country {
  id: string;
  code: string;
  name: string;
  region?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  language: string;
  supportedLocales: string[];
  supportedCurrencies: string[];
  supportedLanguages: string[];
  taxRegime?: string | null;
  complianceRefs: string[];
  businessRules: Record<string, unknown>;
  status: CountryStatus;
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CountryFilterParams {
  code?: string;
  region?: string;
  status?: CountryStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CountryListResult {
  items: Country[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCountryPayload {
  code: string;
  name: string;
  region?: string;
  timezone: string;
  locale: string;
  currency: string;
  language: string;
  supportedLocales?: string[];
  supportedCurrencies?: string[];
  supportedLanguages?: string[];
  taxRegime?: string;
  complianceRefs?: string[];
  businessRules?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateCountryPayload = Partial<CreateCountryPayload> & { changeReason?: string };

export interface CountryHistoryEntry {
  id: string;
  countryId: string;
  code: string;
  version: number;
  status: CountryStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface WorkspaceCountryConfig {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  countryCode: string;
  isEnabled: boolean;
  isDefault: boolean;
  isPreferred: boolean;
  priority: number;
  fallbackCountryCode?: string | null;
  configuration: Record<string, unknown>;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWorkspaceCountryConfigPayload {
  countryCode: string;
  organizationId?: string;
  isEnabled?: boolean;
  isDefault?: boolean;
  isPreferred?: boolean;
  priority?: number;
  fallbackCountryCode?: string;
  configuration?: Record<string, unknown>;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateCountryOverridePayload {
  countryCode: string;
  workspaceId?: string;
  organizationId?: string;
  overrideType: CountryOverrideType;
  overrideValue: Record<string, unknown>;
  priority?: number;
  reason?: string;
}

export interface CountryProviderAvailability {
  id: string;
  countryCode: string;
  domain: CountryProviderDomain;
  providerKey: string;
  workspaceId?: string | null;
  isAvailable: boolean;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProviderAvailabilityPayload {
  countryCode: string;
  domain: CountryProviderDomain;
  providerKey: string;
  workspaceId?: string;
  isAvailable?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResolveCountryContextPayload {
  workspaceId: string;
  organizationId?: string;
  countryCode?: string;
}

export interface CountryContext {
  code: string;
  name: string;
  region?: string | null;
  timezone: string;
  locale: string;
  currency: string;
  language: string;
  supportedLocales: string[];
  supportedCurrencies: string[];
  supportedLanguages: string[];
  taxRegime?: string | null;
  complianceRefs: string[];
  businessRules: Record<string, unknown>;
  isDefault: boolean;
  isPreferred: boolean;
  configuration: Record<string, unknown>;
  overrides: Record<string, unknown>;
}

export interface CountryResolutionResult {
  status: CountryResolutionStatus;
  workspaceId: string;
  requestedCountryCode?: string | null;
  context: CountryContext | null;
  reasons: string[];
  resolvedAt: string;
  resolutionTimeMs: number;
}

export interface ValidateCountryCombinationPayload {
  workspaceId: string;
  countryCode: string;
  providerKey?: string;
  marketplaceKey?: string;
  capability?: string;
  providerDomain?: CountryProviderDomain;
  currency?: string;
  locale?: string;
  featureFlags?: Record<string, boolean>;
}

export interface CountryValidationIssue {
  type: CountryValidationIssueType;
  message: string;
}

export interface CountryValidationResult {
  valid: boolean;
  issues: CountryValidationIssue[];
  warnings: string[];
}

// ── Currency & Exchange Rates (`currency` module) ────────────────
export type CurrencyStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type RoundingMode = 'HALF_UP' | 'HALF_DOWN' | 'HALF_EVEN' | 'UP' | 'DOWN' | 'CEILING' | 'FLOOR';
export type RateSource = 'MANUAL' | 'SCHEDULED' | 'PROVIDER';
export type RateType = 'SPOT' | 'HISTORICAL' | 'DAILY_CLOSE' | 'CUSTOM';
export type RateStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type ConversionDirection = 'IDENTITY' | 'DIRECT' | 'INVERSE' | 'CROSS';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  roundingMode: RoundingMode;
  status: CurrencyStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyFilterParams {
  code?: string;
  status?: CurrencyStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CurrencyListResult {
  items: Currency[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  decimals?: number;
  roundingMode?: RoundingMode;
  metadata?: Record<string, unknown>;
}

export interface UpdateCurrencyPayload {
  name?: string;
  symbol?: string;
  decimals?: number;
  roundingMode?: RoundingMode;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface CurrencyHistoryEntry {
  id: string;
  currencyId: string;
  code: string;
  version: number;
  status: CurrencyStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface WorkspaceCurrencyConfig {
  id: string;
  workspaceId: string;
  baseCurrency: string;
  reportingCurrency?: string | null;
  staleToleranceMinutes: number;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertWorkspaceCurrencyConfigPayload {
  baseCurrency: string;
  reportingCurrency?: string;
  staleToleranceMinutes?: number;
  configuration?: Record<string, unknown>;
}

export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType: RateType;
  source: RateSource | string;
  providerKey?: string | null;
  effectiveAt: string;
  fetchedAt: string;
  status: RateStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  isAbnormal: boolean;
  supersedesId?: string | null;
  version: number;
  workspaceId?: string | null;
  createdAt: string;
}

export interface ExchangeRateFilterParams {
  baseCurrency?: string;
  quoteCurrency?: string;
  source?: RateSource;
  workspaceId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ExchangeRateListResult {
  items: ExchangeRate[];
  total: number;
}

export interface RecordRatePayload {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  rateType?: RateType;
  effectiveAt?: string;
  workspaceId?: string;
  requiresApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RefreshRateFromProviderPayload {
  providerKey: string;
  baseCurrency: string;
  quoteCurrency: string;
  workspaceId?: string;
  requiresApproval?: boolean;
}

export interface ResolveRateWithFallbackPayload {
  baseCurrency: string;
  quoteCurrency: string;
  workspaceId?: string;
  requiresApproval?: boolean;
}

export interface UpdateRatePayload {
  rate: number;
  effectiveAt?: string;
  changeReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RejectRatePayload {
  reason: string;
}

export interface ExchangeRateProviderConfig {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigureProviderPriorityPayload {
  providerKey: string;
  workspaceId?: string;
  isEnabled?: boolean;
  priority?: number;
}

export interface ConvertAmountPayload {
  workspaceId?: string;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  asOfDate?: string;
  allowStale?: boolean;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  convertedCurrency: string;
  rate: number;
  rateDirection: ConversionDirection;
  rateEffectiveAt: string;
  rateSource: RateSource | string;
  stale: boolean;
  conversionTimestamp: string;
}

// ── Tax Engine (`tax` module) ────────────────────────────────────
export type TaxType = 'SALES_TAX' | 'GST' | 'VAT' | 'SERVICE_TAX' | 'WITHHOLDING' | 'CUSTOM';
export type JurisdictionLevel = 'COUNTRY' | 'STATE' | 'REGION' | 'CITY';
export type CalculationMode = 'INCLUSIVE' | 'EXCLUSIVE';
export type TaxRuleStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
export type TaxOverrideType = 'GLOBAL' | 'ORGANIZATION' | 'WORKSPACE';
export type TaxTransactionType = 'PROCUREMENT' | 'PRICING' | 'ORDER' | 'INVOICE' | 'REFUND' | 'SETTLEMENT' | 'SAAS_BILLING';

export interface TaxJurisdiction {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  region?: string | null;
  level: JurisdictionLevel;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxJurisdictionFilterParams {
  countryCode?: string;
  level?: JurisdictionLevel;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaxJurisdictionListResult {
  items: TaxJurisdiction[];
  total: number;
}

export interface CreateJurisdictionPayload {
  code: string;
  name: string;
  countryCode: string;
  region?: string;
  level?: JurisdictionLevel;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateJurisdictionPayload {
  name?: string;
  region?: string;
  level?: JurisdictionLevel;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface TaxThresholds {
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: string | null;
}

export interface TaxRule {
  id: string;
  ruleKey: string;
  name: string;
  taxType: TaxType | string;
  jurisdictionCode: string;
  rate: number;
  calculationMode: CalculationMode;
  isCompound: boolean;
  reverseCharge: boolean;
  priority: number;
  status: TaxRuleStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  workspaceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxRulePayload {
  ruleKey: string;
  name: string;
  taxType: TaxType;
  jurisdictionCode: string;
  rate: number;
  calculationMode?: CalculationMode;
  isCompound?: boolean;
  compoundOnRuleKeys?: string[];
  reverseCharge?: boolean;
  priority?: number;
  applicability?: Record<string, unknown>;
  exemptions?: string[];
  thresholds?: TaxThresholds;
  workspaceId?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaxRulePayload {
  name?: string;
  rate?: number;
  calculationMode?: CalculationMode;
  isCompound?: boolean;
  compoundOnRuleKeys?: string[];
  reverseCharge?: boolean;
  priority?: number;
  applicability?: Record<string, unknown>;
  exemptions?: string[];
  thresholds?: TaxThresholds;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface RollbackTaxRulePayload {
  toVersion: number;
  reason?: string;
}

export interface TaxRuleFilterParams {
  ruleKey?: string;
  taxType?: TaxType;
  jurisdictionCode?: string;
  status?: TaxRuleStatus;
  workspaceId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaxRuleListResult {
  items: TaxRule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaxRuleHistoryEntry {
  id: string;
  ruleId: string;
  ruleKey: string;
  version: number;
  status: TaxRuleStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface CreateTaxOverridePayload {
  workspaceId?: string;
  organizationId?: string;
  ruleKey?: string;
  jurisdictionCode?: string;
  taxType?: TaxType;
  overrideType: TaxOverrideType;
  overrideValue: Record<string, unknown>;
  authorizedBy: string;
  priority?: number;
  reason?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface TaxApplicabilityContext {
  marketplaceKey?: string;
  productCategory?: string;
  customerType?: string;
  transactionType?: TaxTransactionType;
  exemptionCodes?: string[];
}

export interface CalculateTaxPayload {
  workspaceId: string;
  organizationId?: string;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  taxType?: TaxType;
  context?: TaxApplicabilityContext;
  effectiveDate?: string;
  persist?: boolean;
}

export interface TaxLineBreakdown {
  ruleKey: string;
  ruleVersion: number;
  taxType: TaxType | string;
  base: number;
  rate: number;
  amount: number;
  isCompound: boolean;
  isReverseCharge: boolean;
}

export interface TaxCalculationResult {
  workspaceId: string;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  totalTaxAmount: number;
  totalReverseChargeAmount: number;
  calculationMode: CalculationMode;
  isExempt: boolean;
  breakdown: TaxLineBreakdown[];
  effectiveDate: string;
  calculatedAt: string;
  recordId?: string | null;
  warnings: string[];
}

export interface TaxCalculationRecord {
  id: string;
  transactionType: TaxTransactionType | string;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  taxAmount: number;
  isReverseCharge: boolean;
  isExempt: boolean;
  calculatedAt: string;
  effectiveDate: string;
}

export interface TaxCalculationRecordFilterParams {
  workspaceId?: string;
  transactionType?: TaxTransactionType;
  transactionRef?: string;
  jurisdictionCode?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TaxCalculationRecordListResult {
  items: TaxCalculationRecord[];
  total: number;
}

// ── GST / VAT (`gst-vat` module) ─────────────────────────────────
export type GstVatRegistrationStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type GstVatDirection = 'INPUT' | 'OUTPUT';
export type GstVatTreatment = 'STANDARD' | 'INTRA_REGION' | 'INTER_REGION' | 'REVERSE_CHARGE' | 'ZERO_RATED' | 'EXEMPT';
export type GstVatTransactionStatus = 'RECORDED' | 'ADJUSTED' | 'REVERSED';
export type GstVatAdjustmentType = 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'REVERSAL';

export interface GstVatRegistration {
  id: string;
  workspaceId: string;
  jurisdictionCode: string;
  taxType: TaxType | string;
  registrationNumber: string;
  registrationType?: string | null;
  status: GstVatRegistrationStatus;
  effectiveFrom: string;
  effectiveTo?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGstVatRegistrationPayload {
  workspaceId: string;
  jurisdictionCode: string;
  taxType: TaxType;
  registrationNumber: string;
  registrationType?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateGstVatRegistrationPayload {
  registrationNumber?: string;
  registrationType?: string;
  status?: GstVatRegistrationStatus;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export interface GstVatRegistrationFilterParams {
  workspaceId?: string;
  jurisdictionCode?: string;
  taxType?: TaxType;
  status?: GstVatRegistrationStatus;
  page?: number;
  limit?: number;
}

export interface GstVatRegistrationListResult {
  items: GstVatRegistration[];
  total: number;
}

export interface GstVatTaxCode {
  id: string;
  code: string;
  description: string;
  category?: string | null;
  taxType: TaxType | string;
  jurisdictionCode?: string | null;
  ruleKey?: string | null;
  isZeroRated: boolean;
  status: string;
  workspaceId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGstVatTaxCodePayload {
  code: string;
  description: string;
  category?: string;
  taxType: TaxType;
  jurisdictionCode?: string;
  ruleKey?: string;
  isZeroRated?: boolean;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateGstVatTaxCodePayload {
  description?: string;
  category?: string;
  ruleKey?: string;
  isZeroRated?: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface GstVatTaxCodeFilterParams {
  code?: string;
  taxType?: TaxType;
  jurisdictionCode?: string;
  workspaceId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface GstVatTaxCodeListResult {
  items: GstVatTaxCode[];
  total: number;
}

export interface ApplyGstVatContext {
  productCategory?: string;
  customerType?: string;
  taxCodeCode?: string;
  exemptionCodes?: string[];
  isReverseChargeEligible?: boolean;
}

export interface ApplyGstVatPayload {
  workspaceId: string;
  organizationId?: string;
  taxType: TaxType;
  direction: GstVatDirection;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  originJurisdictionCode?: string;
  destinationJurisdictionCode: string;
  context?: ApplyGstVatContext;
  effectiveDate?: string;
  persist?: boolean;
}

export interface GstVatApplicationResult {
  workspaceId: string;
  direction: GstVatDirection;
  treatment: GstVatTreatment;
  taxCalculation: TaxCalculationResult;
  transactionId?: string | null;
  registrationId?: string | null;
  isItcEligible: boolean;
  itcAmount?: number | null;
  warnings: string[];
}

export type GstVatValidationIssueType = 'MISSING_REGISTRATION' | 'INVALID_TAX_CODE' | 'CONFLICTING_RULES' | 'EXPIRED_CONFIGURATION';

export interface GstVatValidationIssue {
  type: GstVatValidationIssueType;
  message: string;
}

export interface GstVatValidationResult {
  valid: boolean;
  issues: GstVatValidationIssue[];
  warnings: string[];
}

export interface GstVatTransaction {
  id: string;
  workspaceId: string;
  taxCalculationRecordId: string;
  direction: GstVatDirection;
  treatment: GstVatTreatment;
  registrationId?: string | null;
  taxCodeId?: string | null;
  originJurisdictionCode?: string | null;
  destinationJurisdictionCode: string;
  isItcEligible: boolean;
  itcAmount?: number | null;
  transactionType: TaxTransactionType | string;
  transactionRef: string;
  status: GstVatTransactionStatus;
  createdAt: string;
}

export interface GstVatTransactionFilterParams {
  workspaceId?: string;
  direction?: GstVatDirection;
  transactionType?: TaxTransactionType;
  transactionRef?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface GstVatTransactionListResult {
  items: GstVatTransaction[];
  total: number;
}

export interface GstVatAdjustment {
  id: string;
  workspaceId: string;
  originalTransactionId: string;
  adjustmentType: GstVatAdjustmentType;
  reason?: string | null;
  taxCalculationRecordId?: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface RecordGstVatAdjustmentPayload {
  originalTransactionId: string;
  adjustmentType: GstVatAdjustmentType;
  reason?: string;
  amount: number;
  currency: string;
  computeViaEngine?: boolean;
}

// ── Compliance Framework (`compliance-framework` module) ─────────
export type ComplianceRequirementType = 'REGISTRATION' | 'LICENSE' | 'CERTIFICATION' | 'DECLARATION' | 'DOCUMENT' | 'POLICY';
export type ComplianceAction = 'SUPPLIER_APPROVAL' | 'PROCUREMENT' | 'LISTING' | 'MARKETPLACE_PUBLISHING' | 'WAREHOUSE_OPERATION' | 'OTHER';
export type ComplianceSubjectType = 'SUPPLIER' | 'WAREHOUSE' | 'MARKETPLACE_LISTING' | 'PRODUCT' | 'ORGANIZATION' | 'PROCUREMENT_ORDER' | 'OTHER';
export type ComplianceRuleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ComplianceRecordStatus = 'REQUIRED' | 'PENDING' | 'COMPLIANT' | 'EXPIRING' | 'EXPIRED' | 'REJECTED' | 'WAIVED' | 'NON_APPLICABLE';
export type ComplianceIssueType = 'MISSING_REQUIREMENT' | 'CONFLICTING_RULES' | 'EXPIRED_RECORD' | 'INVALID_RULE_CONFIGURATION';

export interface ComplianceRule {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  requirementType: ComplianceRequirementType | string;
  actions: (ComplianceAction | string)[];
  countryCode?: string | null;
  region?: string | null;
  marketplaceKey?: string | null;
  productCategory?: string | null;
  supplierId?: string | null;
  warehouseId?: string | null;
  businessType?: string | null;
  mandatory: boolean;
  thresholds: Record<string, unknown>;
  exemptionCodes: string[];
  renewalPeriodDays?: number | null;
  reminderDaysBeforeExpiry?: number | null;
  priority: number;
  status: ComplianceRuleStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComplianceRulePayload {
  workspaceId?: string;
  organizationId?: string;
  key: string;
  name: string;
  description?: string;
  requirementType: ComplianceRequirementType;
  actions: ComplianceAction[];
  countryCode?: string;
  region?: string;
  marketplaceKey?: string;
  productCategory?: string;
  supplierId?: string;
  warehouseId?: string;
  businessType?: string;
  mandatory?: boolean;
  thresholds?: Record<string, unknown>;
  exemptionCodes?: string[];
  renewalPeriodDays?: number;
  reminderDaysBeforeExpiry?: number;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export type UpdateComplianceRulePayload = Partial<Omit<CreateComplianceRulePayload, 'workspaceId' | 'organizationId' | 'key' | 'requirementType'>> & {
  changeReason?: string;
};

export interface ComplianceRuleFilterParams {
  workspaceId?: string;
  key?: string;
  requirementType?: ComplianceRequirementType;
  countryCode?: string;
  marketplaceKey?: string;
  status?: ComplianceRuleStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ComplianceRuleListResult {
  data: ComplianceRule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComplianceRuleHistoryEntry {
  id: string;
  ruleId: string;
  status: ComplianceRuleStatus | string;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface ComplianceReasonPayload {
  reason: string;
}

export interface ValidateCompliancePayload {
  action: ComplianceAction;
  subjectType: ComplianceSubjectType;
  subjectId: string;
  organizationId?: string;
  countryCode?: string;
  region?: string;
  marketplaceKey?: string;
  productCategory?: string;
  supplierId?: string;
  warehouseId?: string;
  businessType?: string;
  exemptionCodes?: string[];
}

export interface ComplianceRequirementOutcome {
  ruleId: string;
  ruleKey: string;
  name: string;
  requirementType: ComplianceRequirementType | string;
  mandatory: boolean;
  status: ComplianceRecordStatus;
  recordId?: string | null;
  reason?: string | null;
}

export interface ComplianceIssue {
  type: ComplianceIssueType;
  ruleKey?: string;
  message: string;
}

export interface ComplianceValidationResult {
  compliant: boolean;
  requirements: ComplianceRequirementOutcome[];
  blockingRequirements: ComplianceRequirementOutcome[];
  issues: ComplianceIssue[];
  warnings: string[];
  evaluatedAt: string;
}

export interface ComplianceRecord {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  ruleId: string;
  ruleKey: string;
  ruleVersion: number;
  subjectType: string;
  subjectId: string;
  status: ComplianceRecordStatus;
  referenceNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  evidenceDocumentId?: string | null;
  evaluationSnapshot: Record<string, unknown>;
  lastCheckedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  isOverride: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceRecordFilterParams {
  ruleId?: string;
  ruleKey?: string;
  subjectType?: ComplianceSubjectType;
  subjectId?: string;
  status?: ComplianceRecordStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ComplianceRecordListResult {
  data: ComplianceRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ComplianceRecordHistoryEntry {
  id: string;
  recordId: string;
  fromStatus?: string | null;
  toStatus: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface SubmitComplianceEvidencePayload {
  referenceNumber?: string;
  issuedAt?: string;
  expiresAt?: string;
  evidenceDocumentId?: string;
}

export interface ReviewComplianceRecordPayload {
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
}

export interface OverrideComplianceRecordPayload {
  status: ComplianceRecordStatus;
  reason: string;
}

// ── Multi-Brand (`multi-brand` module) ────────────────────────────
export type MultiBrandStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface MultiBrand {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  code: string;
  name: string;
  legalOwner?: string | null;
  logoUrl?: string | null;
  domains: string[];
  description?: string | null;
  status: MultiBrandStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  countryCodes: string[];
  regionCodes: string[];
  currencyCodes: string[];
  marketplaceAccountIds: string[];
  localeCode?: string | null;
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  fulfillmentPreferences: Record<string, unknown>;
  seoDefaults: Record<string, unknown>;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMultiBrandPayload {
  workspaceId: string;
  organizationId?: string;
  code: string;
  name: string;
  legalOwner?: string;
  logoUrl?: string;
  domains?: string[];
  description?: string;
  countryCodes?: string[];
  regionCodes?: string[];
  currencyCodes?: string[];
  marketplaceAccountIds?: string[];
  localeCode?: string;
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  fulfillmentPreferences?: Record<string, unknown>;
  seoDefaults?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateMultiBrandPayload = Partial<Omit<CreateMultiBrandPayload, 'workspaceId' | 'organizationId' | 'code'>> & { changeReason?: string };

export interface ChangeBrandOwnershipPayload {
  legalOwner: string;
  reason?: string;
}

export interface MultiBrandFilterParams {
  workspaceId?: string;
  organizationId?: string;
  code?: string;
  status?: MultiBrandStatus;
  countryCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MultiBrandListResult {
  items: MultiBrand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MultiBrandHistoryEntry {
  id: string;
  brandId: string;
  version: number;
  status: MultiBrandStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface LinkBrandEntityPayload {
  entityType: string;
  entityId: string;
  isShared?: boolean;
  isPrimary?: boolean;
}

export interface BrandEntityLink {
  id: string;
  brandId: string;
  entityType: string;
  entityId: string;
  isShared: boolean;
  isPrimary: boolean;
  createdAt: string;
}

// ── Multi-Business & Enterprise Structure (`multi-business` module) ──
export type MultiBusinessStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type MultiBusinessVisibilityScope = 'ORGANIZATION' | 'BUSINESS' | 'PRIVATE';

export interface MultiBusinessContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface MultiBusiness {
  id: string;
  organizationId?: string | null;
  workspaceId: string;
  parentBusinessId?: string | null;
  code: string;
  name: string;
  legalName?: string | null;
  businessType?: string | null;
  registrationNumber?: string | null;
  taxIdentifier?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  currencyCode?: string | null;
  timezone?: string | null;
  contacts: MultiBusinessContact[];
  status: MultiBusinessStatus;
  version: number;
  isDefault: boolean;
  priority: number;
  visibilityScope: MultiBusinessVisibilityScope;
  workspaceIds: string[];
  brandIds: string[];
  warehouseIds: string[];
  marketplaceAccountIds: string[];
  supplierIds: string[];
  regionalSettingsProfileKey?: string | null;
  taxJurisdictionCode?: string | null;
  complianceProfileKey?: string | null;
  billingAccountRef?: string | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMultiBusinessPayload {
  workspaceId: string;
  organizationId?: string;
  parentBusinessId?: string;
  code: string;
  name: string;
  legalName?: string;
  businessType?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  countryCode?: string;
  regionCode?: string;
  currencyCode?: string;
  timezone?: string;
  contacts?: MultiBusinessContact[];
  visibilityScope?: MultiBusinessVisibilityScope;
  workspaceIds?: string[];
  brandIds?: string[];
  warehouseIds?: string[];
  marketplaceAccountIds?: string[];
  supplierIds?: string[];
  regionalSettingsProfileKey?: string;
  taxJurisdictionCode?: string;
  complianceProfileKey?: string;
  billingAccountRef?: string;
  settings?: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export type UpdateMultiBusinessPayload = Partial<Omit<CreateMultiBusinessPayload, 'workspaceId' | 'organizationId' | 'parentBusinessId' | 'code'>> & {
  changeReason?: string;
};

export interface SetParentBusinessPayload {
  parentBusinessId?: string;
  reason?: string;
}

export interface ChangeBusinessOwnershipPayload {
  legalName?: string;
  registrationNumber?: string;
  taxIdentifier?: string;
  reason?: string;
}

export interface MultiBusinessFilterParams {
  organizationId?: string;
  workspaceId?: string;
  parentBusinessId?: string;
  code?: string;
  status?: MultiBusinessStatus;
  countryCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MultiBusinessListResult {
  items: MultiBusiness[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MultiBusinessHistoryEntry {
  id: string;
  businessId: string;
  version: number;
  status: MultiBusinessStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface LinkBusinessEntityPayload {
  entityType: string;
  entityId: string;
  isShared?: boolean;
  isPrimary?: boolean;
}

export interface BusinessEntityLink {
  id: string;
  businessId: string;
  entityType: string;
  entityId: string;
  isShared: boolean;
  isPrimary: boolean;
  createdAt: string;
}

// ── Enterprise Workflow Engine (`enterprise-workflow-engine` module) ──
// Prefixed `Enterprise*` to avoid collision with the unrelated `ai-workflow` module's Workflow* types.
export type EnterpriseWorkflowDefinitionStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'DEPRECATED' | 'ARCHIVED';
export type EnterpriseWorkflowKind = 'SEQUENTIAL' | 'PARALLEL' | 'CONDITIONAL' | 'EVENT_DRIVEN' | 'HUMAN_IN_THE_LOOP';
export type EnterpriseWorkflowTriggerType = 'API' | 'EVENT' | 'SCHEDULE' | 'APPROVAL' | 'RULE' | 'AI_DECISION' | 'MANUAL';
export type EnterpriseWorkflowExecutionStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'PAUSED' | 'COMPENSATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
export type EnterpriseWorkflowStepStatus = 'PENDING' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'COMPENSATED' | 'CANCELLED';
export type EnterpriseWorkflowStepType =
  | 'TASK'
  | 'APPROVAL'
  | 'NOTIFICATION'
  | 'RULE_EVALUATION'
  | 'AI_WORKFLOW'
  | 'BUSINESS_ACTION'
  | 'EXTERNAL_INTEGRATION'
  | 'CONDITION'
  | 'PARALLEL'
  | 'LOOP'
  | 'TIMER'
  | 'SUB_WORKFLOW';

export interface EnterpriseWorkflowStepDefinition {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  condition?: RuleConditionGroup;
  onSuccess?: string[];
  onFailure?: string[];
  retries?: number;
  timeoutMs?: number;
  slaMs?: number;
  assigneeRef?: string;
  requiredPermission?: { module: string; resource: string; action: string };
  compensation?: EnterpriseWorkflowStepDefinition;
}

export interface EnterpriseWorkflowStageDefinition {
  id: string;
  name: string;
  parallel?: boolean;
  steps: EnterpriseWorkflowStepDefinition[];
}

export interface EnterpriseWorkflowDefinition {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  version: number;
  status: EnterpriseWorkflowDefinitionStatus;
  workflowKind: EnterpriseWorkflowKind;
  triggerType: EnterpriseWorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  stages: EnterpriseWorkflowStageDefinition[];
  variables: Record<string, unknown>;
  slaMs?: number | null;
  escalationConfig?: Record<string, unknown> | null;
  maxRetries: number;
  timeoutMs?: number | null;
  isTemplate: boolean;
  templateKey?: string | null;
  supersedesId?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnterpriseWorkflowDefinitionPayload {
  key: string;
  name: string;
  description?: string;
  workflowKind?: EnterpriseWorkflowKind;
  triggerType?: EnterpriseWorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  stages: EnterpriseWorkflowStageDefinition[];
  variables?: Record<string, unknown>;
  slaMs?: number;
  escalationConfig?: Record<string, unknown>;
  maxRetries?: number;
  timeoutMs?: number;
  isTemplate?: boolean;
  templateKey?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  organizationId?: string;
  businessId?: string;
  isGlobal?: boolean;
}

export interface UpdateEnterpriseWorkflowDefinitionPayload {
  name?: string;
  description?: string;
  workflowKind?: EnterpriseWorkflowKind;
  triggerType?: EnterpriseWorkflowTriggerType;
  triggerConfig?: Record<string, unknown>;
  stages?: EnterpriseWorkflowStageDefinition[];
  variables?: Record<string, unknown>;
  slaMs?: number;
  escalationConfig?: Record<string, unknown>;
  maxRetries?: number;
  timeoutMs?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface EnterpriseWorkflowDefinitionFilterParams {
  key?: string;
  status?: EnterpriseWorkflowDefinitionStatus;
  workflowKind?: EnterpriseWorkflowKind;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EnterpriseWorkflowDefinitionListResult {
  data: EnterpriseWorkflowDefinition[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EnterpriseWorkflowDefinitionHistoryEntry {
  id: string;
  definitionId: string;
  version: number;
  status: EnterpriseWorkflowDefinitionStatus;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface EnterpriseWorkflowStepExecution {
  id: string;
  executionId: string;
  stageId: string;
  stepId: string;
  stepIndex: number;
  stepType: string;
  status: EnterpriseWorkflowStepStatus;
  output?: Record<string, unknown> | null;
  startTime: string;
  endTime?: string | null;
  attemptNumber: number;
  dueAt?: string | null;
  escalatedAt?: string | null;
  assignedTo?: string | null;
  externalRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface EnterpriseWorkflowExecution {
  id: string;
  workspaceId: string;
  businessId?: string | null;
  definitionId: string;
  definitionVersion: number;
  status: EnterpriseWorkflowExecutionStatus;
  triggerType: EnterpriseWorkflowTriggerType;
  triggeredBy?: string | null;
  idempotencyKey?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  variables: Record<string, unknown>;
  currentStageIndex?: number | null;
  currentStepId?: string | null;
  startTime: string;
  endTime?: string | null;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted: boolean;
  stepExecutions?: EnterpriseWorkflowStepExecution[];
}

export interface ExecuteEnterpriseWorkflowPayload {
  definitionId: string;
  input?: Record<string, unknown>;
  triggerType?: EnterpriseWorkflowTriggerType;
  triggeredBy?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface EnterpriseWorkflowExecutionFilterParams {
  definitionId?: string;
  status?: EnterpriseWorkflowExecutionStatus;
  page?: number;
  limit?: number;
}

export interface EnterpriseWorkflowExecutionListResult {
  data: EnterpriseWorkflowExecution[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ResumeEnterpriseWorkflowStepExecutionPayload {
  status: 'COMPLETED' | 'FAILED';
  output?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ReassignEnterpriseWorkflowStepPayload {
  assignedTo: string;
}

export interface EnterpriseWorkflowActionReasonPayload {
  reason?: string;
}

// ── Monitoring Framework additions (`monitoring-framework` module) ──
export type MonitoringSloStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type MonitoringAlertSeverity = 'WARNING' | 'CRITICAL';
export type MonitoringAlertRuleStatus = 'ACTIVE' | 'PAUSED';
export type MonitoringIncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type MonitoringDimension = 'AVAILABILITY' | 'LATENCY' | 'THROUGHPUT' | 'ERROR_RATE' | 'SATURATION' | 'QUEUE_BACKLOG';

export interface MonitoringSlo {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  service: string;
  dimension: string;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  windowMinutes: number;
  version: number;
  status: MonitoringSloStatus;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitoringSloPayload {
  service: string;
  dimension: MonitoringDimension;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  windowMinutes?: number;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMonitoringSloPayload {
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  windowMinutes?: number;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface MonitoringSloFilterParams {
  service?: string;
  status?: MonitoringSloStatus;
  page?: number;
  limit?: number;
}

export interface MonitoringSloListResult {
  data: MonitoringSlo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MonitoringAlertRule {
  id: string;
  workspaceId?: string | null;
  sloId?: string | null;
  sourceKey: string;
  service?: string | null;
  dimension?: string | null;
  conditionField: string;
  conditionOperator: string;
  conditionValue: unknown;
  severity: MonitoringAlertSeverity;
  cooldownMinutes: number;
  notifyTargetType?: string | null;
  notifyTargetRef?: string | null;
  status: MonitoringAlertRuleStatus;
  lastTriggeredAt?: string | null;
  createdAt: string;
}

export interface CreateMonitoringAlertRulePayload {
  sourceKey: string;
  sloId?: string;
  service?: string;
  dimension?: string;
  conditionField: string;
  conditionOperator: string;
  conditionValue: unknown;
  severity: MonitoringAlertSeverity;
  cooldownMinutes?: number;
  notifyTargetType?: string;
  notifyTargetRef?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitoringAlertRuleFilterParams {
  sourceKey?: string;
  status?: MonitoringAlertRuleStatus;
  page?: number;
  limit?: number;
}

export interface MonitoringAlertRuleListResult {
  data: MonitoringAlertRule[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MonitoringIncident {
  id: string;
  workspaceId?: string | null;
  sourceKeys: string[];
  service?: string | null;
  severity: MonitoringAlertSeverity;
  status: MonitoringIncidentStatus;
  correlationId?: string | null;
  title: string;
  description?: string | null;
  openedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  durationMs?: number | null;
}

export interface ResolveMonitoringIncidentPayload {
  resolution?: string;
}

export interface MonitoringIncidentFilterParams {
  status?: MonitoringIncidentStatus;
  severity?: MonitoringAlertSeverity;
  page?: number;
  limit?: number;
}

export interface MonitoringIncidentListResult {
  data: MonitoringIncident[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type MonitoringCorrelationEventType = 'REQUEST' | 'JOB' | 'EVENT' | 'FAILURE';

export interface MonitoringCorrelationEvent {
  id: string;
  correlationId: string;
  workspaceId?: string | null;
  module: string;
  eventType: MonitoringCorrelationEventType;
  refId?: string | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

// ── Enterprise Health (`enterprise-health` module) ────────────────
export type EnterpriseHealthScope = 'PLATFORM' | 'ORGANIZATION' | 'BUSINESS' | 'WORKSPACE' | 'REGION' | 'PROVIDER';
export type EnterpriseHealthIncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface EnterpriseHealthScoreBreakdown {
  score: number;
  availabilityScore: number;
  latencyScore: number;
  failureScore: number;
  backlogScore: number;
  dependencyScore: number;
  securityScore: number;
  recoveryScore: number;
}

export interface EnterpriseHealthDashboard {
  scope: EnterpriseHealthScope;
  organizationId?: string | null;
  scopeRef?: string | null;
  level: MonitoringHealthLevel;
  previousLevel?: MonitoringHealthLevel | null;
  breakdown: EnterpriseHealthScoreBreakdown;
  openIncidentCount: number;
  unhealthySourceKeys: string[];
  generatedAt: string;
}

export interface EnterpriseHealthIncident {
  id: string;
  organizationId: string;
  scope: EnterpriseHealthScope;
  scopeRef?: string | null;
  severity: MonitoringAlertSeverity;
  status: EnterpriseHealthIncidentStatus;
  title: string;
  description?: string | null;
  affectedSourceKeys: string[];
  affectedRegions: string[];
  affectedProviders: string[];
  affectedWorkspaceIds: string[];
  triggeredWorkflowExecutionId?: string | null;
  openedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseHealthIncidentFilterParams {
  scope?: EnterpriseHealthScope;
  scopeRef?: string;
  status?: EnterpriseHealthIncidentStatus;
  severity?: MonitoringAlertSeverity;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface EnterpriseHealthIncidentListResult {
  data: EnterpriseHealthIncident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RunEnterpriseHealthSweepPayload {
  criticalIncidentWorkflowDefinitionId?: string;
}

export interface EnterpriseHealthSweepResult {
  organizationId: string;
  workspacesScanned: number;
  incidentsCreated: number;
  workflowsTriggered: number;
}

// ── Backup Management (`backup-management` module) ────────────────
export type BackupPolicyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type BackupScope = 'TENANT' | 'SERVICE' | 'FULL_PLATFORM';
export type BackupJobStatus = 'PENDING' | 'RUNNING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type BackupTriggerType = 'MANUAL' | 'SCHEDULED' | 'EVENT';
export type BackupRecordStatus = 'CREATING' | 'AVAILABLE' | 'VERIFYING' | 'VERIFIED' | 'CORRUPT' | 'EXPIRED' | 'DELETED';
export type BackupIntegrityStatus = 'UNVALIDATED' | 'VALID' | 'CORRUPT';

export interface BackupPolicy {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment: string;
  service: string;
  dataType: string;
  backupType: string;
  scope: BackupScope | string;
  frequencyMinutes?: number | null;
  cronExpression?: string | null;
  retentionDays: number;
  maxVersions?: number | null;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  preferredProviderKey?: string | null;
  version: number;
  status: BackupPolicyStatus | string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBackupPolicyPayload {
  environment: string;
  service: string;
  dataType: string;
  backupType: string;
  scope?: BackupScope;
  frequencyMinutes?: number;
  cronExpression?: string;
  retentionDays?: number;
  maxVersions?: number;
  encryptionEnabled?: boolean;
  encryptionAlgorithm?: string;
  compressionEnabled?: boolean;
  compressionAlgorithm?: string;
  preferredProviderKey?: string;
  organizationId?: string;
  isGlobal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateBackupPolicyPayload {
  frequencyMinutes?: number;
  cronExpression?: string;
  retentionDays?: number;
  maxVersions?: number;
  encryptionEnabled?: boolean;
  encryptionAlgorithm?: string;
  compressionEnabled?: boolean;
  compressionAlgorithm?: string;
  preferredProviderKey?: string;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface BackupPolicyFilterParams {
  environment?: string;
  status?: BackupPolicyStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BackupPolicyListResult {
  data: BackupPolicy[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BackupPolicyHistoryEntry {
  id: string;
  policyId: string;
  version: number;
  status: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface TriggerBackupPayload {
  targetWorkspaceIds?: string[];
  idempotencyKey?: string;
  reason?: string;
}

export interface BackupJob {
  id: string;
  policyId: string;
  workspaceId?: string | null;
  triggerType: BackupTriggerType | string;
  triggeredBy?: string | null;
  scope: string;
  targetType: string;
  backupType: string;
  status: BackupJobStatus;
  retryCount: number;
  maxRetries: number;
  backupRecordId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  endedAt?: string | null;
}

export interface BackupJobFilterParams {
  policyId?: string;
  status?: BackupJobStatus;
  page?: number;
  limit?: number;
}

export interface BackupJobListResult {
  data: BackupJob[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BackupRecord {
  id: string;
  workspaceId?: string | null;
  policyId?: string | null;
  jobId?: string | null;
  targetType: string;
  backupType: string;
  providerKey: string;
  externalRef: string;
  sizeBytes?: string | null;
  checksum?: string | null;
  version: number;
  status: BackupRecordStatus | string;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  integrityStatus: BackupIntegrityStatus | string;
  restorable: boolean;
  capturedAt: string;
  verifiedAt?: string | null;
  expiresAt?: string | null;
}

export interface BackupRecordFilterParams {
  policyId?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}

export interface BackupRecordListResult {
  data: BackupRecord[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Disaster Recovery (`disaster-recovery` module) ────────────────
export type DrEnvironment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type DrPolicyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type DrRecoveryScope = 'PARTIAL' | 'TENANT' | 'FULL_PLATFORM';
export type DrPlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DrExecutionStatus = 'PENDING' | 'AWAITING_APPROVAL' | 'VALIDATING' | 'RUNNING' | 'PAUSED' | 'ROLLING_BACK' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type DrExecutionTrigger = 'MANUAL' | 'DETECTED_DISASTER' | 'SCHEDULED_DRILL';
export type DrCheckpointStatus = 'PENDING' | 'IN_PROGRESS' | 'VALIDATED' | 'FAILED' | 'ROLLED_BACK' | 'SIMULATED';

export interface DrPolicy {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment: DrEnvironment | string;
  criticalService: string;
  rpoMinutes: number;
  rtoMinutes: number;
  recoveryPriority: number;
  coverageTargets: string[];
  dependencyOrder: string[];
  regionFailoverConfig?: unknown;
  autoTriggerOnDetection: boolean;
  version: number;
  status: DrPolicyStatus | string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrPolicyPayload {
  environment: DrEnvironment;
  criticalService: string;
  rpoMinutes: number;
  rtoMinutes: number;
  recoveryPriority?: number;
  coverageTargets: string[];
  dependencyOrder?: string[];
  regionFailoverConfig?: Record<string, unknown>;
  autoTriggerOnDetection?: boolean;
  organizationId?: string;
  isGlobal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateDrPolicyPayload {
  rpoMinutes?: number;
  rtoMinutes?: number;
  recoveryPriority?: number;
  coverageTargets?: string[];
  dependencyOrder?: string[];
  regionFailoverConfig?: Record<string, unknown>;
  autoTriggerOnDetection?: boolean;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface DrPolicyFilterParams {
  environment?: DrEnvironment;
  status?: DrPolicyStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DrPolicyListResult {
  data: DrPolicy[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface DrPolicyHistoryEntry {
  id: string;
  policyId: string;
  version: number;
  status: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface DrRecoveryPlan {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  policyId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  scope: DrRecoveryScope | string;
  targets: string[];
  workflowDefinitionId: string;
  requiresApproval: boolean;
  approvalDefinitionKey?: string | null;
  isTemplate: boolean;
  dryRunDefault: boolean;
  version: number;
  status: DrPlanStatus | string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDrRecoveryPlanPayload {
  key: string;
  name: string;
  description?: string;
  policyId?: string;
  scope: DrRecoveryScope;
  targets: string[];
  stages?: EnterpriseWorkflowStageDefinition[];
  requiresApproval?: boolean;
  approvalDefinitionKey?: string;
  isTemplate?: boolean;
  dryRunDefault?: boolean;
  organizationId?: string;
  isGlobal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateDrRecoveryPlanPayload {
  name?: string;
  description?: string;
  targets?: string[];
  stages?: EnterpriseWorkflowStageDefinition[];
  requiresApproval?: boolean;
  approvalDefinitionKey?: string;
  dryRunDefault?: boolean;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export interface DrRecoveryPlanFilterParams {
  policyId?: string;
  scope?: DrRecoveryScope;
  status?: DrPlanStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DrRecoveryPlanListResult {
  data: DrRecoveryPlan[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface TriggerDrRecoveryPayload {
  isDryRun?: boolean;
  targetWorkspaceIds?: string[];
  triggerType?: DrExecutionTrigger;
  idempotencyKey?: string;
  reason?: string;
}

export interface DetectDrDisasterPayload {
  criticalService: string;
  description: string;
  environment?: string;
}

export interface DrRecoveryCheckpoint {
  id: string;
  executionId: string;
  sequence: number;
  targetType: string;
  status: DrCheckpointStatus | string;
  backupRecordId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface DrRecoveryExecution {
  id: string;
  workspaceId?: string | null;
  planId: string;
  policyId?: string | null;
  scope: DrRecoveryScope | string;
  status: DrExecutionStatus;
  isDryRun: boolean;
  triggerType: DrExecutionTrigger | string;
  triggeredBy?: string | null;
  targetWorkspaceIds: string[];
  approvalRequestId?: string | null;
  workflowExecutionId?: string | null;
  currentCheckpointSequence: number;
  rpoActualMinutes?: number | null;
  rtoActualMinutes?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt: string;
  endedAt?: string | null;
  checkpoints?: DrRecoveryCheckpoint[];
}

export interface DrExecutionFilterParams {
  planId?: string;
  status?: DrExecutionStatus;
  page?: number;
  limit?: number;
}

export interface DrRecoveryExecutionListResult {
  data: DrRecoveryExecution[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Roles & Permissions (`roles-permissions` module) ──────────────
// Reuses the pre-existing `PermissionEffect` / `EffectivePermission` / `EffectivePermissionsResponse` types above.
export type RoleType = 'SYSTEM' | 'ORGANIZATION' | 'WORKSPACE' | 'CUSTOM';
export type RoleStatus = 'ACTIVE' | 'ARCHIVED';
export type PermissionAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'PUBLISH' | 'EXPORT' | 'MANAGE' | 'ADMIN';
export type PermissionScope = 'ORGANIZATION' | 'WORKSPACE' | 'MARKETPLACE' | 'WAREHOUSE' | 'ENTITY';
export type PrincipalType = 'USER' | 'TEAM' | 'SERVICE_ACCOUNT';
export type AssignmentScopeType = 'ORGANIZATION' | 'WORKSPACE' | 'MARKETPLACE' | 'WAREHOUSE' | 'ENTITY';
export type AssignmentStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface AccessRole {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: RoleType;
  parentRoleId?: string | null;
  isSystem: boolean;
  status: RoleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessRolePayload {
  key: string;
  name: string;
  description?: string;
  type: RoleType;
  parentRoleId?: string;
  organizationId?: string;
}

export interface UpdateAccessRolePayload {
  name?: string;
  description?: string;
  parentRoleId?: string | null;
}

export interface AccessRoleFilterParams {
  type?: RoleType;
  status?: RoleStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AccessRoleListResult {
  data: AccessRole[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AccessPermission {
  id: string;
  key: string;
  module: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description?: string | null;
  createdAt: string;
}

export interface CreateAccessPermissionPayload {
  key: string;
  module: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description?: string;
}

export interface AccessPermissionFilterParams {
  module?: string;
  resource?: string;
  action?: PermissionAction;
  scope?: PermissionScope;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AccessPermissionListResult {
  data: AccessPermission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Runtime shape actually returned by `GET roles/:id/permissions` — a flat grant list, not the full `RolePermission` join record. */
export interface RolePermissionGrant {
  permissionKey: string;
  effect: PermissionEffect;
}

export interface GrantRolePermissionPayload {
  permissionKey: string;
  effect?: PermissionEffect;
  constraints?: Record<string, unknown>;
}

export interface RolePermissionHistoryEntry {
  id: string;
  roleId: string;
  permissionKey: string;
  action: 'GRANTED' | 'REVOKED' | 'DENIED';
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface RoleAssignment {
  id: string;
  workspaceId: string;
  roleId: string;
  principalType: PrincipalType;
  principalId: string;
  scopeType: AssignmentScopeType;
  scopeId?: string | null;
  status: AssignmentStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  assignedBy?: string | null;
  revokedBy?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignRolePayload {
  roleId: string;
  principalType: PrincipalType;
  principalId: string;
  scopeType?: AssignmentScopeType;
  scopeId?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  reason?: string;
}

export interface RevokeRoleAssignmentPayload {
  reason?: string;
}

export interface AssignmentFilterParams {
  roleId?: string;
  principalType?: PrincipalType;
  principalId?: string;
  status?: AssignmentStatus;
  scopeType?: AssignmentScopeType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface RoleAssignmentListResult {
  data: RoleAssignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RoleAssignmentHistoryEntry {
  id: string;
  assignmentId: string;
  fromStatus?: AssignmentStatus | null;
  toStatus: AssignmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

// ── Supplier Provider Foundation (`supplier-provider` module) ────
// Read-only registry + health — this module exposes no config/credential CRUD via API.
export interface SupplierProviderMetadata {
  code: string;
  displayName: string;
  description: string;
  version: string;
  supportedCountries: string[];
  capabilities: string[];
  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;
  requiresCredentials: boolean;
  credentialFields: unknown[];
}

export interface SupplierProviderHealth {
  providerCode: string;
  status: string;
  latencyMs?: number | null;
  message?: string | null;
  checkedAt: string;
}

// ── Shipping Provider Foundation (`shipping-provider` module) ────
// Read-only registry + health — this module exposes no config/credential CRUD via API.
export interface ShippingProviderRegion {
  code: string;
  displayName: string;
}

export interface ShippingProviderMetadata {
  providerKey: string;
  displayName: string;
  description: string;
  version: string;
  supportedCountries: string[];
  supportedRegions: ShippingProviderRegion[];
  serviceLevels: string[];
  capabilities: string[];
  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;
  requiresCredentials: boolean;
  credentialFields: unknown[];
}

export interface ShippingProviderHealth {
  providerKey: string;
  status: string;
  latencyMs?: number | null;
  message?: string | null;
  checkedAt: string;
}

// ── Notification Provider Foundation (`notification-provider` module) ──
export type NotificationProviderRegistryStatus = 'PENDING' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type NotificationProviderConfigStatus = 'ACTIVE' | 'DISABLED' | 'ARCHIVED';
export type NotificationProviderCredentialStatus = 'PENDING_VALIDATION' | 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'INVALID' | 'VALIDATION_FAILED' | 'REVOKED';

export interface NotificationProviderRegistryEntry {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  channel: string;
  displayName: string;
  version: string;
  status: NotificationProviderRegistryStatus;
  capabilities: string[];
  priority: number;
  isDefault: boolean;
  fallbackOrder: string[];
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterNotificationProviderEntryPayload {
  workspaceId?: string;
  providerKey: string;
  channel: string;
  displayName: string;
  version: string;
  capabilities?: string[];
  priority?: number;
  isDefault?: boolean;
  fallbackOrder?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateNotificationProviderEntryPayload {
  displayName?: string;
  version?: string;
  capabilities?: string[];
  priority?: number;
  isDefault?: boolean;
  fallbackOrder?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotificationProviderRegistryFilterParams {
  workspaceId: string;
  channel?: string;
  status?: NotificationProviderRegistryStatus;
  page?: number;
  limit?: number;
}

export interface NotificationProviderRegistryListResult {
  data: NotificationProviderRegistryEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationProviderConfig {
  id: string;
  workspaceId: string;
  providerKey: string;
  channel: string;
  name: string;
  status: NotificationProviderConfigStatus;
  priority: number;
  isFallback: boolean;
  fallbackProviderKeys: string[];
  version: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  settings: unknown;
  timeoutMs?: number | null;
  maxRetryAttempts?: number | null;
  retryBackoffMs?: number | null;
  maxRequestsPerMinute?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationProviderConfigPayload {
  workspaceId: string;
  providerKey: string;
  channel: string;
  name: string;
  priority?: number;
  isFallback?: boolean;
  fallbackProviderKeys?: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  settings?: Record<string, unknown>;
  timeoutMs?: number;
  maxRetryAttempts?: number;
  retryBackoffMs?: number;
  maxRequestsPerMinute?: number;
}

export interface UpdateNotificationProviderConfigPayload {
  name?: string;
  priority?: number;
  isFallback?: boolean;
  fallbackProviderKeys?: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  settings?: Record<string, unknown>;
  timeoutMs?: number;
  maxRetryAttempts?: number;
  retryBackoffMs?: number;
  maxRequestsPerMinute?: number;
  changeReason?: string;
}

export interface NotificationProviderConfigFilterParams {
  workspaceId: string;
  channel?: string;
  providerKey?: string;
  status?: NotificationProviderConfigStatus;
  page?: number;
  limit?: number;
}

export interface NotificationProviderConfigListResult {
  data: NotificationProviderConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationProviderConfigHistoryEntry {
  id: string;
  configId: string;
  version: number;
  status: string;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

/** Never carries `encryptedFields` — matches every response this module's credential controller returns. */
export interface NotificationProviderCredential {
  id: string;
  workspaceId: string;
  providerKey: string;
  channel: string;
  credentialSetName: string;
  description?: string | null;
  status: NotificationProviderCredentialStatus;
  version: number;
  expiresAt?: string | null;
  lastValidatedAt?: string | null;
  lastRotatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationProviderCredentialPayload {
  workspaceId: string;
  providerKey: string;
  channel: string;
  credentialSetName: string;
  description?: string;
  fields: Record<string, string>;
  expiresAt?: string;
}

export interface UpdateNotificationProviderCredentialPayload {
  description?: string;
  fields?: Record<string, string>;
  expiresAt?: string;
  changeReason?: string;
}

export interface RotateNotificationProviderCredentialPayload {
  fields: Record<string, string>;
}

export interface NotificationProviderCredentialFilterParams {
  workspaceId: string;
  providerKey?: string;
  channel?: string;
  status?: NotificationProviderCredentialStatus;
  page?: number;
  limit?: number;
}

export interface NotificationProviderCredentialListResult {
  data: NotificationProviderCredential[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationProviderCredentialHistoryEntry {
  id: string;
  credentialId: string;
  version: number;
  status: string;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface NotificationProviderConnectionValidationResult {
  valid: boolean;
  checkedAt: string;
  message?: string;
  latencyMs?: number;
}

export interface NotificationDelivery {
  id: string;
  workspaceId: string;
  notificationId?: string | null;
  channel: string;
  providerKey?: string | null;
  /** Present on the raw persisted record even where the admin response DTO doesn't declare it. */
  configId?: string | null;
  recipientAddress: string;
  recipientName?: string | null;
  subject?: string | null;
  /** Truncated/safe preview — never the full message body. */
  messagePreview?: string | null;
  templateId?: string | null;
  status: string;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  idempotencyKey?: string | null;
  scheduledAt?: string | null;
  queuedAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  openedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  providerRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  batchId?: string | null;
  latencyMs?: number | null;
  metadata?: unknown;
  createdAt: string;
}

export interface NotificationDeliveryFilterParams {
  workspaceId: string;
  channel?: string;
  providerKey?: string;
  status?: string;
  batchId?: string;
  notificationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface NotificationDeliveryListResult {
  data: NotificationDelivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Marketplace Webhook (`marketplace-webhook` module) — inbound provider webhooks ──
export type MarketplaceWebhookEvent =
  | 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED'
  | 'LISTING_CREATED' | 'LISTING_UPDATED' | 'LISTING_DELETED'
  | 'INVENTORY_UPDATED' | 'PRICE_UPDATED'
  | 'RETURN_REQUESTED' | 'RETURN_APPROVED' | 'RETURN_REJECTED'
  | 'SHIPMENT_CREATED' | 'SHIPMENT_UPDATED'
  | 'PAYMENT_RECEIVED' | 'REFUND_ISSUED'
  | 'DISPUTE_OPENED' | 'DISPUTE_RESOLVED'
  | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_ACTIVATED'
  | 'CUSTOM';

export type MarketplaceWebhookConfigStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED' | 'ERROR' | 'EXPIRED';
export type MarketplaceWebhookDeliveryStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED' | 'DUPLICATE';

export interface MarketplaceWebhookConfig {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalWebhookId?: string;
  callbackUrl: string;
  events: MarketplaceWebhookEvent[];
  status: MarketplaceWebhookConfigStatus;
  isActive: boolean;
  lastDeliveryAt?: string;
  failureCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterMarketplaceWebhookPayload {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  callbackUrl: string;
  events: MarketplaceWebhookEvent[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMarketplaceWebhookPayload {
  callbackUrl?: string;
  events?: MarketplaceWebhookEvent[];
  metadata?: Record<string, unknown>;
}

export interface MarketplaceWebhookConfigFilterParams {
  workspaceId?: string;
  accountId?: string;
  providerKey?: string;
  status?: MarketplaceWebhookConfigStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface MarketplaceWebhookConfigListResult {
  items: MarketplaceWebhookConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketplaceWebhookDelivery {
  id: string;
  workspaceId: string;
  accountId: string;
  webhookConfigId: string;
  externalEventId: string;
  event: MarketplaceWebhookEvent;
  status: MarketplaceWebhookDeliveryStatus;
  receivedAt: string;
  processedAt?: string;
  attemptCount: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceWebhookDeliveryFilterParams {
  webhookConfigId?: string;
  event?: MarketplaceWebhookEvent;
  status?: MarketplaceWebhookDeliveryStatus;
  page?: number;
  limit?: number;
}

export interface MarketplaceWebhookDeliveryListResult {
  items: MarketplaceWebhookDelivery[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketplaceWebhookSecret {
  secret: string;
  rotatedAt: string;
}

export interface MarketplaceWebhookMetrics {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
}

// ── Marketplace Event (`marketplace-event` module) — normalized event processing ──
export type MarketplaceEventTypeKey =
  | 'CATALOG_UPDATED' | 'INVENTORY_UPDATED' | 'LISTING_CREATED' | 'LISTING_UPDATED' | 'LISTING_DELETED'
  | 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED'
  | 'SHIPMENT_CREATED' | 'SHIPMENT_UPDATED'
  | 'RETURN_REQUESTED' | 'RETURN_APPROVED' | 'RETURN_REJECTED' | 'RETURN_COMPLETED'
  | 'PRICE_UPDATED' | 'PAYMENT_RECEIVED' | 'REFUND_ISSUED' | 'REPORT_AVAILABLE'
  | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_ACTIVATED' | 'DISPUTE_OPENED' | 'DISPUTE_RESOLVED' | 'UNKNOWN';

export type MarketplaceEventCategory = 'CATALOG' | 'INVENTORY' | 'LISTING' | 'ORDER' | 'SHIPMENT' | 'RETURN' | 'PRICING' | 'PAYMENT' | 'REPORT' | 'ACCOUNT' | 'DISPUTE' | 'UNKNOWN';
export type MarketplaceEventStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'CANCELLED' | 'DUPLICATE' | 'STALE';
export type MarketplaceEventPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type MarketplaceEventSource = 'WEBHOOK' | 'POLLING' | 'SYNC' | 'MANUAL' | 'SYSTEM';

export interface MarketplaceEventRecord {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  externalEventId: string;
  eventType: MarketplaceEventTypeKey;
  category: MarketplaceEventCategory;
  source: MarketplaceEventSource;
  priority: MarketplaceEventPriority;
  status: MarketplaceEventStatus;
  version?: number;
  occurredAt: string;
  receivedAt: string;
  processedAt?: string;
  attemptCount: number;
  maxAttempts: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceEventFilterParams {
  workspaceId?: string;
  accountId?: string;
  providerKey?: string;
  eventType?: MarketplaceEventTypeKey;
  category?: MarketplaceEventCategory;
  status?: MarketplaceEventStatus;
  source?: MarketplaceEventSource;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface MarketplaceEventListResult {
  items: MarketplaceEventRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketplaceEventMetrics {
  totalEvents: number;
  pendingEvents: number;
  processingEvents: number;
  processedEvents: number;
  failedEvents: number;
  duplicateEvents: number;
  successRate: number;
}

// ── Marketplace Queue Manager (`marketplace-queue-manager` module) ──
export type MarketplaceQueueType =
  | 'CATALOG_SYNC' | 'INVENTORY_SYNC' | 'LISTING_SYNC' | 'ORDER_SYNC' | 'SHIPMENT_SYNC'
  | 'RETURN_SYNC' | 'PRICING_SYNC' | 'REPORT_SYNC' | 'WEBHOOK_PROCESSING' | 'EVENT_PROCESSING';

export type MarketplaceJobState = 'WAITING' | 'ACTIVE' | 'DELAYED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'STALE';
export type MarketplaceQueueStatus = 'ACTIVE' | 'PAUSED' | 'DRAINING' | 'SHUTDOWN' | 'ERROR';
export type MarketplaceJobPriority = 10 | 5 | 2 | 1;

export interface MarketplaceJobInfo {
  id: string;
  queueName: string;
  queueType: MarketplaceQueueType;
  workspaceId: string;
  provider: string;
  accountId?: string;
  state: MarketplaceJobState;
  priority: number;
  attempts: number;
  maxAttempts: number;
  progress?: number;
  data: { workspaceId: string; provider: string; accountId?: string; type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> };
  failedReason?: string;
  stacktrace?: string[];
  addedAt: string;
  processedAt?: string;
  finishedAt?: string;
  delay?: number;
  timestamp: string;
}

export interface MarketplaceQueueMetrics {
  queueName: string;
  queueType: MarketplaceQueueType;
  status: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
  isPaused: boolean;
  concurrency?: number;
  throughput?: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  errorRate?: number;
  lastJobAt?: string;
  healthScore: number;
}

export interface MarketplaceQueueHealth {
  queueName: string;
  isHealthy: boolean;
  status: string;
  issues: string[];
  metrics: MarketplaceQueueMetrics;
  checkedAt: string;
}

export interface MarketplaceAggregatedQueueMetrics {
  queueType: MarketplaceQueueType;
  totalJobs: number;
  waitingJobs: number;
  activeJobs: number;
  delayedJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  avgProcessingTime?: number;
  avgWaitTime?: number;
  throughput?: number;
  errorRate: number;
  healthScore: number;
}

export interface MarketplaceQueueErrorSummary {
  errorType: string;
  errorMessage: string;
  count: number;
  firstOccurrence: string;
  lastOccurrence: string;
  affectedJobs: string[];
  isRecoverable: boolean;
}

export interface MarketplaceJobHistoryEntry {
  jobId: string;
  queueName: string;
  queueType: MarketplaceQueueType;
  workspaceId: string;
  state: MarketplaceJobState;
  event: string;
  message?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface MarketplaceDeadLetterJob {
  id: string;
  queueName: string;
  queueType: MarketplaceQueueType;
  workspaceId: string;
  provider: string;
  accountId?: string;
  originalJobId: string;
  payload: { workspaceId: string; provider: string; accountId?: string; type: string; data: Record<string, unknown>; metadata?: Record<string, unknown> };
  failedReason: string;
  failedAt: string;
  attempts: number;
  isReprocessed: boolean;
  reprocessedAt?: string;
}

export interface MarketplaceRateLimitConfig {
  workspaceId: string;
  provider: string;
  accountId?: string;
  queueType: MarketplaceQueueType;
  maxConcurrent: number;
  maxPerMinute: number;
  maxPerHour: number;
  isEnabled: boolean;
}

export interface RetryMarketplaceJobPayload {
  workspaceId: string;
  queueType: MarketplaceQueueType;
  jobId: string;
  resetAttempts?: boolean;
  priority?: MarketplaceJobPriority;
}

export interface CancelMarketplaceJobPayload {
  workspaceId: string;
  queueType: MarketplaceQueueType;
  jobId: string;
  reason?: string;
  removeFromQueue?: boolean;
}

export interface RecoverStaleMarketplaceJobsPayload {
  queueType: MarketplaceQueueType;
  workspaceId?: string;
  olderThanMinutes: number;
}

export interface ReprocessMarketplaceDeadLetterJobPayload {
  workspaceId: string;
  deadLetterJobId: string;
}

export interface SetMarketplaceRateLimitPayload {
  workspaceId: string;
  provider: string;
  accountId?: string;
  queueType: MarketplaceQueueType;
  maxConcurrent: number;
  maxPerMinute: number;
  maxPerHour: number;
  isEnabled: boolean;
}

export interface MarketplaceQueueOperationResult {
  success: boolean;
  message: string;
  queueName?: string;
  jobId?: string;
  jobIds?: string[];
  metadata?: Record<string, unknown>;
}

// ── Marketplace Error Normalizer (`marketplace-error-normalizer` module) ──
export type MarketplaceErrorCategory = 'PROVIDER' | 'API' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'NETWORK' | 'TIMEOUT' | 'RATE_LIMIT' | 'QUEUE' | 'BUSINESS' | 'SYSTEM' | 'UNKNOWN';
export type MarketplaceErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MarketplaceErrorHistoryEntry {
  id: string;
  workspaceId: string;
  provider: string;
  accountId?: string;
  module?: string;
  operation?: string;
  errorCode: string;
  errorCategory: MarketplaceErrorCategory;
  errorSeverity: MarketplaceErrorSeverity;
  errorMessage: string;
  providerCode?: string;
  providerMessage?: string;
  httpStatus?: number;
  requestId?: string;
  resourceId?: string;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceErrorOccurrence {
  historyId: string;
  workspaceId: string;
  errorCode: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface MarketplaceErrorSearchParams {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  module?: string;
  errorCode?: string;
  category?: MarketplaceErrorCategory;
  severity?: MarketplaceErrorSeverity;
  startDate?: string;
  endDate?: string;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}

export interface MarketplaceErrorAggregationByCategory {
  category: MarketplaceErrorCategory;
  count: number;
  occurrences: number;
}

export interface MarketplaceErrorAggregationBySeverity {
  severity: MarketplaceErrorSeverity;
  count: number;
  occurrences: number;
}

// ── Marketplace Connection Test (`marketplace-connection-test` module) ──
export type MarketplaceConnectionStatus = 'CONNECTED' | 'FAILED' | 'TIMEOUT' | 'UNREACHABLE' | 'UNKNOWN';
export type MarketplaceConnectionAuthStatus = 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'CREDENTIALS_MISSING' | 'CREDENTIALS_EXPIRED' | 'CREDENTIALS_INVALID' | 'UNKNOWN';
export type MarketplaceConnectionCapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'NOT_CHECKED';
export type MarketplaceConnectionErrorCategory = 'CONFIGURATION' | 'AUTHENTICATION' | 'NETWORK' | 'TIMEOUT' | 'RATE_LIMIT' | 'UNSUPPORTED_CAPABILITY' | 'PROVIDER_ERROR' | 'UNKNOWN';
export type MarketplaceConnectionTestTrigger = 'MANUAL' | 'BULK' | 'SCHEDULED';

export interface MarketplaceConnectionTestRequest {
  workspaceId: string;
  providerKey: string;
  accountId?: string;
  capabilityKey?: string;
  timeoutMs?: number;
}

export interface MarketplaceConnectionTestResult {
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string;
  success: boolean;
  connectionStatus: MarketplaceConnectionStatus;
  authStatus: MarketplaceConnectionAuthStatus;
  capabilityStatus: MarketplaceConnectionCapabilityStatus;
  responseTimeMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorCategory?: MarketplaceConnectionErrorCategory;
  retryable: boolean;
  testedAt: string;
  triggeredBy?: MarketplaceConnectionTestTrigger;
}

export interface MarketplaceConnectionTestRecord {
  id: string;
  correlationId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string;
  success: boolean;
  connectionStatus: string;
  authStatus: string;
  capabilityStatus?: string;
  responseTimeMs?: number;
  errorCode?: string;
  errorMessage?: string;
  errorCategory?: string;
  retryable: boolean;
  testedAt: string;
  triggeredBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceConnectionTestHistoryParams {
  workspaceId: string;
  providerKey?: string;
  accountId?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

export interface MarketplaceConnectionTestHistoryResult {
  items: MarketplaceConnectionTestRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Marketplace Audit (`marketplace-audit` module) — activity/audit timeline ──
export type MarketplaceActivityModule =
  | 'ACCOUNT' | 'CONFIGURATION' | 'CREDENTIAL' | 'CATALOG_SYNC' | 'INVENTORY_SYNC' | 'LISTING_SYNC'
  | 'ORDER_SYNC' | 'SHIPMENT_SYNC' | 'RETURN_SYNC' | 'PRICING_SYNC' | 'REPORT_SYNC'
  | 'WEBHOOK' | 'EVENT' | 'QUEUE' | 'ADAPTER' | 'PROVIDER';

export type MarketplaceActivityAction =
  | 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED' | 'CONNECTED' | 'DISCONNECTED'
  | 'SYNC_STARTED' | 'SYNC_COMPLETED' | 'SYNC_FAILED' | 'SYNC_CANCELLED' | 'SYNC_RETRIED'
  | 'WEBHOOK_REGISTERED' | 'WEBHOOK_RECEIVED' | 'WEBHOOK_PROCESSED' | 'WEBHOOK_FAILED'
  | 'EVENT_RECEIVED' | 'EVENT_PROCESSED' | 'EVENT_FAILED'
  | 'JOB_QUEUED' | 'JOB_STARTED' | 'JOB_COMPLETED' | 'JOB_FAILED' | 'JOB_RETRIED' | 'JOB_CANCELLED'
  | 'CREDENTIAL_ROTATED' | 'CREDENTIAL_VALIDATED' | 'CREDENTIAL_EXPIRED'
  | 'RATE_LIMITED' | 'ERROR_OCCURRED' | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED';

export type MarketplaceActivityStatus = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'CANCELLED' | 'RETRIED' | 'PARTIAL';
export type MarketplaceActorType = 'USER' | 'SYSTEM' | 'SCHEDULER' | 'WEBHOOK' | 'PROVIDER' | 'API';
export type MarketplaceEntityType = 'ACCOUNT' | 'CONFIGURATION' | 'CREDENTIAL' | 'SYNC_JOB' | 'WEBHOOK' | 'EVENT' | 'QUEUE_JOB' | 'ADAPTER' | 'PROVIDER' | 'USER';

export interface MarketplaceActivityActor {
  type: MarketplaceActorType;
  id?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceActivityChangeReference {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
}

export interface MarketplaceActivityRecord {
  id: string;
  workspaceId: string;
  provider: string;
  accountId?: string;
  module: MarketplaceActivityModule;
  action: MarketplaceActivityAction;
  status: MarketplaceActivityStatus;
  entityType: MarketplaceEntityType;
  entityId: string;
  entityName?: string;
  actor: MarketplaceActivityActor;
  changeReference?: MarketplaceActivityChangeReference;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
  jobId?: string;
  externalId?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface MarketplaceActivitySearchParams {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  module?: MarketplaceActivityModule;
  action?: MarketplaceActivityAction;
  status?: MarketplaceActivityStatus;
  actorType?: MarketplaceActorType;
  actorId?: string;
  entityType?: MarketplaceEntityType;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface MarketplaceActivityTimelineResult {
  workspaceId: string;
  provider?: string;
  accountId?: string;
  startDate: string;
  endDate: string;
  activities: MarketplaceActivityRecord[];
  totalCount: number;
}

export interface MarketplaceAuditStatistics {
  workspaceId: string;
  totalActivities: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  cancelledCount: number;
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byActor: Record<string, number>;
  topEntities: Array<{ entityType: MarketplaceEntityType; entityId: string; activityCount: number }>;
}

export interface MarketplaceSuspiciousActivity {
  activityId: string;
  workspaceId: string;
  reason: string;
  severity: string;
  detectedAt: string;
  isResolved: boolean;
  resolvedAt?: string;
}

// ── AI Description Generator (`ai-description` module) ──────────
export type AiDescriptionStatus = 'PENDING' | 'GENERATING' | 'GENERATED' | 'MANUALLY_EDITED' | 'APPROVED' | 'FAILED';
export type AiGenerationTone = 'PROFESSIONAL' | 'PREMIUM' | 'TECHNICAL' | 'MARKETING' | 'LUXURY';
export type AiDescriptionProviderKey = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'CUSTOM';
export type DescriptionSectionKey =
  | 'PRODUCT_TITLE' | 'SHORT_DESCRIPTION' | 'LONG_DESCRIPTION' | 'BULLET_POINTS' | 'KEY_FEATURES' | 'KEY_BENEFITS'
  | 'TECHNICAL_SPECIFICATIONS' | 'PACKAGE_CONTENTS' | 'USAGE_INSTRUCTIONS' | 'CARE_INSTRUCTIONS'
  | 'WARRANTY_INFORMATION' | 'FAQS' | 'SEARCH_KEYWORDS' | 'BACKEND_SEARCH_TERMS';

export interface AiDescriptionFaqItem {
  question: string;
  answer: string;
}

export interface GeneratedDescriptionContent {
  productTitle?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  bulletPoints?: string[];
  keyFeatures?: string[];
  keyBenefits?: string[];
  technicalSpecifications?: string | null;
  packageContents?: string | null;
  usageInstructions?: string | null;
  careInstructions?: string | null;
  warrantyInformation?: string | null;
  faqs?: AiDescriptionFaqItem[];
  searchKeywords?: string[];
  backendSearchTerms?: string[];
}

export interface AiDescription {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: AiDescriptionStatus;
  version: number;
  provider: AiDescriptionProviderKey;
  model?: string | null;
  tone: AiGenerationTone;
  language: string;
  promptTemplateId?: string | null;
  content: GeneratedDescriptionContent;
  aiQualityScore?: number | null;
  tokensUsed?: number | null;
  generationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  generationStartedAt?: string | null;
  generationCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiDescriptionHistoryEntry {
  id: string;
  descriptionId: string;
  workspaceId: string;
  fromStatus: AiDescriptionStatus;
  toStatus: AiDescriptionStatus;
  version: number;
  sectionsRegenerated?: DescriptionSectionKey[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: string;
}

export interface CreateAiDescriptionPayload {
  catalogProductId: string;
  provider: AiDescriptionProviderKey;
  model?: string;
  tone: AiGenerationTone;
  language?: string;
  promptTemplateId?: string;
  sections?: DescriptionSectionKey[];
}

export interface RegenerateAiDescriptionSectionsPayload {
  sections: DescriptionSectionKey[];
  provider?: AiDescriptionProviderKey;
  model?: string;
  tone?: AiGenerationTone;
  language?: string;
  reason?: string;
}

export interface ManualEditAiDescriptionPayload {
  content: GeneratedDescriptionContent;
  notes?: string;
}

export interface ApproveAiDescriptionPayload {
  notes?: string;
}

export interface AiDescriptionFilterParams extends PaginationParams {
  status?: AiDescriptionStatus[];
  catalogProductId?: string;
  provider?: AiDescriptionProviderKey;
  tone?: AiGenerationTone;
  language?: string;
}

export type AiDescriptionListResult = PaginatedResult<AiDescription>;

export interface AiDescriptionStats {
  total: number;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
  byTone: Record<string, number>;
  averageQualityScore: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}

// ── AI Image Generator (`ai-image` module) ───────────────────────
export type AiImageStatus = 'PENDING' | 'GENERATING' | 'GENERATED' | 'MANUALLY_UPLOADED' | 'APPROVED' | 'FAILED';
export type AiImageTypeKey = 'MAIN_PRODUCT' | 'WHITE_BACKGROUND' | 'LIFESTYLE' | 'INFOGRAPHIC' | 'FEATURE_HIGHLIGHT' | 'DIMENSION' | 'PACKAGING' | 'VARIANT' | 'BRAND' | 'PROMOTIONAL';
export type AiImageStyleKey = 'PHOTOREALISTIC' | 'STUDIO' | 'LIFESTYLE' | 'FLAT_LAY' | 'MINIMALIST' | 'LUXURY' | 'VIBRANT' | 'TECHNICAL';
export type AiImageAspectRatio = 'SQUARE_1_1' | 'LANDSCAPE_16_9' | 'PORTRAIT_4_5' | 'PORTRAIT_9_16' | 'LANDSCAPE_4_3' | 'BANNER_3_1';
export type AiImageResolutionKey = 'SD_512' | 'HD_1024' | 'FHD_2048' | 'UHD_4096';
export type AiImageProviderKey = 'OPENAI_DALLE' | 'STABILITY_AI' | 'MIDJOURNEY' | 'GOOGLE_IMAGEN' | 'CUSTOM';

export interface AiImageDimensions {
  width: number;
  height: number;
}

export interface GeneratedAiImage {
  imageId: string;
  imageType: AiImageTypeKey;
  url: string;
  thumbnailUrl?: string;
  style: AiImageStyleKey;
  aspectRatio: AiImageAspectRatio;
  resolution: AiImageResolutionKey;
  dimensions?: AiImageDimensions;
  fileSizeBytes?: number;
  mimeType?: string;
  prompt?: string;
  revisedPrompt?: string;
  qualityScore?: number;
  isApproved: boolean;
  generatedAt: string;
}

export interface BatchAiImageRequest {
  imageType: AiImageTypeKey;
  style: AiImageStyleKey;
  aspectRatio: AiImageAspectRatio;
  resolution: AiImageResolutionKey;
  promptOverride?: string;
  variantId?: string;
}

export interface AiImageSet {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: AiImageStatus;
  version: number;
  provider: AiImageProviderKey;
  model?: string | null;
  promptTemplateId?: string | null;
  basePrompt?: string | null;
  negativePrompt?: string | null;
  images: GeneratedAiImage[];
  imageQualityScore?: number | null;
  imagesGenerated?: number | null;
  generationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  generationStartedAt?: string | null;
  generationCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiImageHistoryEntry {
  id: string;
  imageSetId: string;
  workspaceId: string;
  fromStatus: AiImageStatus;
  toStatus: AiImageStatus;
  version: number;
  imageTypesRegenerated?: AiImageTypeKey[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotImageUrls?: unknown;
  createdAt: string;
}

export interface CreateAiImageSetPayload {
  catalogProductId: string;
  provider: AiImageProviderKey;
  model?: string;
  promptTemplateId?: string;
  basePrompt?: string;
  negativePrompt?: string;
  requests?: BatchAiImageRequest[];
}

export interface RegenerateAiImagesPayload {
  imageTypes: AiImageTypeKey[];
  provider?: AiImageProviderKey;
  model?: string;
  requests?: BatchAiImageRequest[];
  reason?: string;
}

export interface ManualUploadAiImagePayload {
  imageId: string;
  imageType: AiImageTypeKey;
  url: string;
  thumbnailUrl?: string;
  style: AiImageStyleKey;
  aspectRatio: AiImageAspectRatio;
  resolution: AiImageResolutionKey;
  mimeType?: string;
  notes?: string;
}

export interface ApproveAiImagesPayload {
  approvedImageIds?: string[];
  notes?: string;
}

export interface AiImageFilterParams extends PaginationParams {
  status?: AiImageStatus[];
  catalogProductId?: string;
  provider?: AiImageProviderKey;
}

export type AiImageSetListResult = PaginatedResult<AiImageSet>;

export interface AiImageStats {
  total: number;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
  averageQualityScore: number;
  totalImagesGenerated: number;
  totalCostUsd: number;
}

// ── AI SEO Optimizer (`ai-seo` module) ────────────────────────────
export type SeoOptimizationStatus = 'PENDING' | 'ANALYZING' | 'OPTIMIZED' | 'MANUALLY_EDITED' | 'APPROVED' | 'FAILED';
export type SeoOptimizationProviderKey = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'CUSTOM';
export type SeoSectionKey = 'PRODUCT_TITLE' | 'BULLET_POINTS' | 'DESCRIPTION' | 'BACKEND_SEARCH_TERMS' | 'SEARCH_KEYWORDS' | 'BRAND_KEYWORDS' | 'CATEGORY_KEYWORDS' | 'LONG_TAIL_KEYWORDS' | 'IMAGE_ALT_TEXT';
export type SeoSearchIntent = 'INFORMATIONAL' | 'NAVIGATIONAL' | 'COMMERCIAL' | 'TRANSACTIONAL';

export interface SeoKeywordDensityResult {
  keyword: string;
  occurrences: number;
  density: number;
}

export interface SeoReadabilityResult {
  score: number;
  gradeLevel: string;
  avgSentenceLength: number;
  complexWordRatio: number;
}

export interface SeoDuplicateContentResult {
  isDuplicate: boolean;
  duplicateRatio: number;
  similarSections?: string[];
}

export interface SeoRecommendation {
  section: SeoSectionKey;
  issue: string;
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SeoAnalysisResult {
  keywordDensity: SeoKeywordDensityResult[];
  readability: SeoReadabilityResult;
  duplicateContent: SeoDuplicateContentResult;
  searchIntent: SeoSearchIntent;
  seoScore: number;
  recommendations: SeoRecommendation[];
}

export interface SeoOptimizedContent {
  productTitle?: string | null;
  bulletPoints?: string[];
  description?: string | null;
  backendSearchTerms?: string[];
  searchKeywords?: string[];
  brandKeywords?: string[];
  categoryKeywords?: string[];
  longTailKeywords?: string[];
  imageAltText?: string[];
}

export interface AiSeoOptimization {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: SeoOptimizationStatus;
  version: number;
  provider: SeoOptimizationProviderKey;
  model?: string | null;
  marketplace?: string | null;
  targetKeywords?: string[] | null;
  promptTemplateId?: string | null;
  originalContent?: SeoOptimizedContent | null;
  optimizedContent: SeoOptimizedContent;
  analysis?: SeoAnalysisResult | null;
  seoScore?: number | null;
  tokensUsed?: number | null;
  optimizationCostUsd?: number | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  optimizationStartedAt?: string | null;
  optimizationCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiSeoHistoryEntry {
  id: string;
  seoId: string;
  workspaceId: string;
  fromStatus: SeoOptimizationStatus;
  toStatus: SeoOptimizationStatus;
  version: number;
  sectionsOptimized?: SeoSectionKey[] | null;
  reason?: string | null;
  changedBy?: string | null;
  snapshotContent?: unknown;
  createdAt: string;
}

export interface CreateSeoOptimizationPayload {
  catalogProductId: string;
  provider: SeoOptimizationProviderKey;
  model?: string;
  marketplace?: string;
  targetKeywords?: string[];
  promptTemplateId?: string;
  sections?: SeoSectionKey[];
}

export interface RegenerateSeoSectionsPayload {
  sections: SeoSectionKey[];
  provider?: SeoOptimizationProviderKey;
  model?: string;
  targetKeywords?: string[];
  reason?: string;
}

export interface ManualSeoEditPayload {
  content: SeoOptimizedContent;
  notes?: string;
}

export interface ApproveSeoPayload {
  notes?: string;
}

export interface SeoOptimizationFilterParams extends PaginationParams {
  status?: SeoOptimizationStatus[];
  catalogProductId?: string;
  provider?: SeoOptimizationProviderKey;
  marketplace?: string;
}

export type SeoOptimizationListResult = PaginatedResult<AiSeoOptimization>;

export interface SeoOptimizationStats {
  total: number;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
  byMarketplace: Record<string, number>;
  averageSeoScore: number;
  totalTokensUsed: number;
  totalCostUsd: number;
}
