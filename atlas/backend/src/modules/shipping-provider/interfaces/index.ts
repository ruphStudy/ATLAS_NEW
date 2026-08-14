// =============================================================
// Shipping Provider Foundation – Core Interfaces & Contracts
//
// Mirrors the existing Marketplace Provider Foundation and Supplier
// Provider Foundation: a generic, string-keyed registry + adapter
// contract that business modules (Dispatch, Shipment Tracking) consume
// without ever referencing a concrete courier's SDK or API shape.
// Adding a new courier means registering a new adapter — this file
// never changes and never names a specific carrier.
// =============================================================

// ── Capabilities ─────────────────────────────────────────────

export enum ShippingCapability {
  RATE_QUOTE = 'RATE_QUOTE',
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
  GENERATE_LABEL = 'GENERATE_LABEL',
  SCHEDULE_PICKUP = 'SCHEDULE_PICKUP',
  CANCEL_PICKUP = 'CANCEL_PICKUP',
  TRACK_SHIPMENT = 'TRACK_SHIPMENT',
  CANCEL_SHIPMENT = 'CANCEL_SHIPMENT',
  CONFIRM_DELIVERY = 'CONFIRM_DELIVERY',
  INITIATE_RTO = 'INITIATE_RTO',
  INITIATE_RETURN = 'INITIATE_RETURN',
  HEALTH_CHECK = 'HEALTH_CHECK',
  TEST_CONNECTION = 'TEST_CONNECTION',
}

export enum ShippingProviderStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEGRADED = 'DEGRADED',
  MAINTENANCE = 'MAINTENANCE',
  DEPRECATED = 'DEPRECATED',
}

export enum ShippingErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNSERVICEABLE_ADDRESS = 'UNSERVICEABLE_ADDRESS',
  UNSUPPORTED_CAPABILITY = 'UNSUPPORTED_CAPABILITY',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export enum ShippingHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export enum ShippingCredentialEncryption {
  AES_256_GCM = 'AES_256_GCM',
  NONE = 'NONE',
}

// ── Metadata ─────────────────────────────────────────────────

export interface ShippingProviderVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface ShippingSupportedRegion {
  code: string; // ISO 3166-1 alpha-2 country code, or a region code
  displayName: string;
}

export interface ShippingProviderCredentialField {
  key: string;
  label: string;
  required: boolean;
  sensitive: boolean;
  placeholder?: string;
}

export interface ShippingProviderMetadata {
  providerKey: string;
  displayName: string;
  description: string;
  version: ShippingProviderVersion;
  website?: string;
  iconUrl?: string;
  supportedCountries: string[];
  supportedRegions: ShippingSupportedRegion[];
  serviceLevels: string[]; // provider-declared, e.g. 'STANDARD' | 'EXPRESS' | 'SAME_DAY' — never hardcoded here
  capabilities: ShippingCapability[];
  rateLimitPerMinute: number;
  timeoutMs: number;
  maxRetries: number;
  requiresCredentials: boolean;
  credentialFields: ShippingProviderCredentialField[];
  pickupRules?: Record<string, unknown>;
}

// ── Credentials ────────────────────────────────────────────────

export interface ShippingProviderCredentials {
  workspaceId: string;
  providerKey: string;
  encryptionAlgorithm: ShippingCredentialEncryption;
  fields: Record<string, string>;
  validatedAt?: Date | null;
  expiresAt?: Date | null;
}

export interface ShippingCredentialValidationResult {
  valid: boolean;
  message?: string;
}

// ── Selection ──────────────────────────────────────────────────

export interface WorkspaceShippingProviderConfig {
  workspaceId: string;
  providerKey: string;
  isEnabled: boolean;
  priority: number;
  customSettings?: Record<string, unknown>;
}

export interface ShippingProviderSelectionCriteria {
  workspaceId: string;
  capability: ShippingCapability;
  originCountry?: string;
  destinationCountry?: string;
  region?: string;
  serviceLevel?: string;
  preferredProviderKey?: string;
  configs?: WorkspaceShippingProviderConfig[];
}

// ── Common Request/Response Envelope ─────────────────────────

export interface ShippingProviderRequest<TParams = Record<string, unknown>> {
  requestId: string;
  workspaceId: string;
  providerKey: string;
  params: TParams;
  timeoutMs?: number;
}

export interface ShippingProviderResponseMeta {
  durationMs: number;
  providerRaw?: unknown;
}

export interface NormalizedShippingError {
  code: ShippingErrorCode;
  message: string;
  providerKey: string;
  retryable: boolean;
  details?: unknown;
}

export interface ShippingProviderResponse<TData = unknown> {
  requestId: string;
  providerKey: string;
  success: boolean;
  data?: TData;
  error?: NormalizedShippingError;
  meta: ShippingProviderResponseMeta;
}

// ── Normalized Domain Models (ATLAS contracts) ────────────────

export interface AtlasCarrierService {
  providerKey: string;
  serviceCode: string;
  serviceName: string;
  serviceLevel: string;
  estimatedDays?: number | null;
}

export interface AtlasRateQuote {
  providerKey: string;
  serviceCode: string;
  serviceName: string;
  cost: number;
  currency: string;
  estimatedDeliveryDays?: number | null;
  rawData: Record<string, unknown>;
}

export interface AtlasShipmentBooking {
  providerKey: string;
  providerShipmentId: string;
  trackingNumber?: string | null;
  serviceCode?: string | null;
  status: string;
  labelUrl?: string | null;
  rawData: Record<string, unknown>;
}

export interface AtlasLabel {
  providerKey: string;
  providerShipmentId: string;
  format: string; // e.g. 'PDF' | 'PNG' | 'ZPL' — provider-declared, never hardcoded here
  labelUrl?: string | null;
  labelData?: string | null; // base64, when the provider returns inline label bytes
}

export interface AtlasPickupResult {
  providerKey: string;
  pickupId: string;
  status: string;
  scheduledDate?: Date | null;
  rawData: Record<string, unknown>;
}

export interface AtlasTrackingEvent {
  providerKey: string;
  trackingNumber: string;
  status: string;
  location?: string | null;
  description: string;
  occurredAt: Date;
  rawData: Record<string, unknown>;
}

// ── Health Check ──────────────────────────────────────────────

export interface ShippingProviderHealthResult {
  providerKey: string;
  status: ShippingHealthStatus;
  latencyMs?: number;
  message?: string | null;
  checkedAt: Date;
  details?: Record<string, unknown>;
}

// ── Request Param Types ───────────────────────────────────────

export interface ShippingAddressParams {
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
}

export interface ShippingPackageParams {
  weight: number;
  weightUnit?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: string;
  declaredValue?: number;
  currency?: string;
}

export interface RateQuoteParams {
  origin: ShippingAddressParams;
  destination: ShippingAddressParams;
  packages: ShippingPackageParams[];
  serviceLevel?: string;
}

export interface CreateShipmentParams {
  origin: ShippingAddressParams;
  destination: ShippingAddressParams;
  packages: ShippingPackageParams[];
  serviceCode?: string;
  reference?: string;
}

export interface GenerateLabelParams {
  providerShipmentId: string;
  format?: string;
}

export interface SchedulePickupParams {
  providerShipmentId: string;
  pickupDate: Date;
  address: ShippingAddressParams;
}

export interface CancelPickupParams {
  pickupId: string;
}

export interface TrackShipmentParams {
  trackingNumber: string;
}

export interface CancelShipmentParams {
  providerShipmentId: string;
  reason?: string;
}

export interface InitiateRtoParams {
  providerShipmentId: string;
  reason?: string;
}

export interface InitiateReturnParams {
  providerShipmentId: string;
  reason?: string;
  pickupAddress?: ShippingAddressParams;
}

// ── Core Provider Interface ───────────────────────────────────

export interface IShippingProviderAdapter {
  readonly metadata: ShippingProviderMetadata;

  supportsCapability(capability: ShippingCapability): boolean;
  supportsCountry(country: string): boolean;
  supportsRegion(region: string): boolean;
  supportsServiceLevel(serviceLevel: string): boolean;

  getRateQuote(request: ShippingProviderRequest<RateQuoteParams>): Promise<ShippingProviderResponse<AtlasRateQuote[]>>;
  createShipment(request: ShippingProviderRequest<CreateShipmentParams>): Promise<ShippingProviderResponse<AtlasShipmentBooking>>;
  generateLabel(request: ShippingProviderRequest<GenerateLabelParams>): Promise<ShippingProviderResponse<AtlasLabel>>;
  schedulePickup(request: ShippingProviderRequest<SchedulePickupParams>): Promise<ShippingProviderResponse<AtlasPickupResult>>;
  cancelPickup(request: ShippingProviderRequest<CancelPickupParams>): Promise<ShippingProviderResponse<AtlasPickupResult>>;
  trackShipment(request: ShippingProviderRequest<TrackShipmentParams>): Promise<ShippingProviderResponse<AtlasTrackingEvent[]>>;
  cancelShipment(request: ShippingProviderRequest<CancelShipmentParams>): Promise<ShippingProviderResponse<AtlasShipmentBooking>>;
  initiateRTO(request: ShippingProviderRequest<InitiateRtoParams>): Promise<ShippingProviderResponse<AtlasShipmentBooking>>;
  initiateReturn(request: ShippingProviderRequest<InitiateReturnParams>): Promise<ShippingProviderResponse<AtlasShipmentBooking>>;

  validateCredentials(credentials: ShippingProviderCredentials): Promise<ShippingCredentialValidationResult>;
  healthCheck(): Promise<ShippingProviderHealthResult>;
  testConnection(): Promise<ShippingProviderHealthResult>;
}

// ── Registry Interface ───────────────────────────────────────

export interface IShippingProviderRegistry {
  register(adapter: IShippingProviderAdapter): void;
  get(providerKey: string): IShippingProviderAdapter;
  getAll(): IShippingProviderAdapter[];
  isRegistered(providerKey: string): boolean;
  getSupportedKeys(): string[];
  getCapable(capability: ShippingCapability): IShippingProviderAdapter[];
}

// ── Audit Events ─────────────────────────────────────────────

export interface ShippingProviderAuditEvent {
  workspaceId: string;
  providerKey: string;
  capability: ShippingCapability;
  requestId: string;
  success: boolean;
  durationMs: number;
  errorCode?: ShippingErrorCode;
  timestamp: Date;
}
