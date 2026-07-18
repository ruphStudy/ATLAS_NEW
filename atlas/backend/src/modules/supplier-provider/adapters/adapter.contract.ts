import {
  AdapterAuditEvent,
  AdapterCapability,
  AdapterHealthStatus,
  AdapterMetadata,
  AdapterMetricEvent,
  AdapterPaginationInput,
  AdapterPaginationOutput,
  AdapterRequestContext,
  AdapterResponseMetadata,
  IntegrationStrategy,
} from './adapter.types';
import type { AdapterError, ExternalReference } from './adapter.types';

/**
 * ISupplierAdapterContract
 *
 * Contract all concrete adapter implementations must satisfy.
 * Extends the foundation ISupplierProviderAdapter with infrastructure concerns.
 */
export interface ISupplierAdapterContract {
  readonly adapterMetadata: AdapterMetadata;

  // ── Capability ────────────────────────────────────────────────
  supportsAdapterCapability(capability: AdapterCapability): boolean;
  supportsStrategy(strategy: IntegrationStrategy): boolean;
  supportsCountryCode(country: string): boolean;
  supportsCurrency(currency: string): boolean;

  // ── Lifecycle ─────────────────────────────────────────────────
  initialize?(workspaceId: string): Promise<void>;
  teardown?(): Promise<void>;

  // ── Health & Connection ───────────────────────────────────────
  checkHealth(workspaceId: string): Promise<AdapterHealthStatus>;
  testConnection(workspaceId: string): Promise<AdapterHealthStatus>;

  // ── Context ───────────────────────────────────────────────────
  buildRequestContext(
    workspaceId: string,
    capability: AdapterCapability,
    options?: {
      userId?: string;
      idempotencyKey?: string;
      meta?: Record<string, unknown>;
    },
  ): AdapterRequestContext;

  // ── Metrics ───────────────────────────────────────────────────
  recordMetric(event: AdapterMetricEvent): void;

  // ── Audit ─────────────────────────────────────────────────────
  recordAuditEvent(event: AdapterAuditEvent): void;

  // ── Pagination ────────────────────────────────────────────────
  normalizePagination(input: AdapterPaginationInput): AdapterPaginationOutput;

  // ── Response metadata ─────────────────────────────────────────
  buildResponseMetadata(
    context: AdapterRequestContext,
    durationMs: number,
    attempt: number,
    extra?: Partial<AdapterResponseMetadata>,
  ): AdapterResponseMetadata;

  // ── External references ───────────────────────────────────────
  buildExternalReference(externalId: string, externalUrl?: string, externalType?: string): ExternalReference;

  // ── Error ─────────────────────────────────────────────────────
  mapError(error: unknown, httpStatus?: number): AdapterError;
}
