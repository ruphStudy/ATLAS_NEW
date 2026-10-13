import { Injectable, Logger } from '@nestjs/common';
import { sanitizeErrorForLog } from '@common/utils';
import { ConfigurationService } from '@config/configuration.service';
import { AmazonAuthService, AmazonAuthError } from '../auth/amazon-auth.service';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { classifyAmazonAuthFailure, AmazonAuthFailureClass } from '../auth/amazon-auth-error.classifier';
import { composeAmazonSandboxCredentials } from '../amazon-credentials.composer';
import { AMAZON_API_PATHS, AMAZON_RATE_LIMITS } from '../constants/amazon.constants';
import { AmazonMarketplace } from '../interfaces/amazon.interfaces';

export interface AmazonSandboxHealthResult {
  status: 'healthy' | 'failed';
  endpoint: string;
  latencyMs?: number;
  errorClass?: AmazonAuthFailureClass | 'CONFIG_MISSING';
  message?: string;
  checkedAt: string;
}

/**
 * Amazon's own documented static-sandbox example request for Catalog Items
 * v2022-04-01 `searchCatalogItems` — historically: marketplaceIds=
 * ATVPDKIKX0DER (US), keywords=samsung,tv, includedData=attributes,
 * dimensions,identifiers,images,productTypes,relationships,salesRanks,
 * summaries,vendorDetails. Deliberately defined ONLY here, inside the
 * sandbox-only health service — NOT in `amazon.constants.ts` (which
 * `AmazonAdapter`/production Discovery read from) — so this canned fixture
 * can never leak into a real customer request. `AMAZON_CATALOG_INCLUDED_DATA`
 * (production's own includedData set) is intentionally NOT reused here:
 * this verification tests Amazon's exact documented example, not ATLAS's
 * own defaults.
 */
const AMAZON_STATIC_SANDBOX_CATALOG_MARKETPLACE = AmazonMarketplace.US;
const AMAZON_STATIC_SANDBOX_CATALOG_KEYWORDS = ['samsung', 'tv'];
const AMAZON_STATIC_SANDBOX_CATALOG_INCLUDED_DATA = [
  'attributes',
  'dimensions',
  'identifiers',
  'images',
  'productTypes',
  'relationships',
  'salesRanks',
  'summaries',
  'vendorDetails',
];

export interface AmazonCatalogSandboxCheckResult {
  status: 'healthy' | 'failed';
  request: {
    marketplaceIds: string[];
    keywords: string[];
    includedData: string[];
  };
  httpStatus?: number;
  /** Only populated on a 200 — Amazon's canned Catalog Items payload, safe to return as-is (no credentials/secrets ever appear in a Catalog Items response body). */
  data?: unknown;
  errorCode?: string;
  errorClass?: AmazonAuthFailureClass | 'CONFIG_MISSING';
  message?: string;
  checkedAt: string;
}

/**
 * Verifies ATLAS's GLOBAL Amazon SP-API *sandbox* configuration only: the
 * dedicated sandbox LWA app (AMAZON_SP_API_SANDBOX_CLIENT_ID/SECRET) + the
 * global sandbox refresh token, always against the sandbox SP-API host —
 * independent of the production/default app and AMAZON_SP_API_ENVIRONMENT.
 * No MarketplaceAccount, no per-workspace seller credential,
 * no seller OAuth — this never touches marketplace-provider-credentials or
 * marketplace-account. Never called at app startup; only on explicit
 * request via the platform-admin endpoint.
 */
@Injectable()
export class AmazonSandboxHealthService {
  private readonly logger = new Logger(AmazonSandboxHealthService.name);

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly authService: AmazonAuthService,
    private readonly spApiClient: AmazonSpApiClient,
  ) {}

  async checkSandboxConnectivity(): Promise<AmazonSandboxHealthResult> {
    const checkedAt = new Date().toISOString();
    const global = this.configurationService.getAmazonProviderConfig();

    let credentials;
    try {
      credentials = composeAmazonSandboxCredentials(global, AmazonMarketplace.US);
    } catch (err) {
      return {
        status: 'failed',
        endpoint: AMAZON_API_PATHS.SELLER_INFO,
        errorClass: 'CONFIG_MISSING',
        message: (err as Error).message,
        checkedAt,
      };
    }

    const start = Date.now();
    try {
      // Exchanges the sandbox refresh token for an access token, then calls
      // one simple SP-API endpoint — the same low-risk endpoint used for
      // real seller connection tests elsewhere in this module.
      await this.authService.getAccessToken(credentials);
      const response = await this.spApiClient.get(
        credentials,
        AMAZON_API_PATHS.SELLER_INFO,
        undefined,
        AMAZON_RATE_LIMITS.SELLER_INFO,
        false,
      );
      const latencyMs = Date.now() - start;

      if (response.status !== 200) {
        return {
          status: 'failed',
          endpoint: AMAZON_API_PATHS.SELLER_INFO,
          latencyMs,
          errorClass: 'TRANSIENT',
          message: `Amazon responded with HTTP ${response.status}`,
          checkedAt,
        };
      }

      return { status: 'healthy', endpoint: AMAZON_API_PATHS.SELLER_INFO, latencyMs, checkedAt };
    } catch (err) {
      const latencyMs = Date.now() - start;
      // AmazonAuthService already classifies token-exchange/refresh failures
      // (AmazonAuthError) — use that classification directly rather than
      // re-deriving it from a generic Error message, which would lose
      // precision (e.g. 'invalid_grant' has no HTTP status left on it once
      // wrapped in a plain Error).
      const { classification, reason } =
        err instanceof AmazonAuthError
          ? { classification: err.classification, reason: err.message }
          : classifyAmazonAuthFailure(err);
      this.logger.warn(`Amazon sandbox connectivity check failed (${classification}): ${reason}`, sanitizeErrorForLog(err));
      return {
        status: 'failed',
        endpoint: AMAZON_API_PATHS.SELLER_INFO,
        latencyMs,
        errorClass: classification,
        message: reason,
        checkedAt,
      };
    }
  }

  /**
   * SANDBOX-ONLY verification of Amazon's own documented static-sandbox
   * example request for Catalog Items `searchCatalogItems` (see the
   * `AMAZON_STATIC_SANDBOX_CATALOG_*` constants above for the exact
   * canned values). Calls the real, existing `AmazonSpApiClient` — no
   * mocking, no synthetic response. This is NOT the production Discovery
   * keyword-search path: Discovery (`discovery/adapters/amazon/amazon.adapter.ts`)
   * never calls this method and is unaffected by it either way.
   */
  async checkCatalogSearchSandbox(): Promise<AmazonCatalogSandboxCheckResult> {
    const checkedAt = new Date().toISOString();
    const request = {
      marketplaceIds: [AMAZON_STATIC_SANDBOX_CATALOG_MARKETPLACE as string],
      keywords: AMAZON_STATIC_SANDBOX_CATALOG_KEYWORDS,
      includedData: AMAZON_STATIC_SANDBOX_CATALOG_INCLUDED_DATA,
    };
    const global = this.configurationService.getAmazonProviderConfig();

    let credentials;
    try {
      credentials = composeAmazonSandboxCredentials(global, AMAZON_STATIC_SANDBOX_CATALOG_MARKETPLACE);
    } catch (err) {
      return {
        status: 'failed',
        request,
        errorClass: 'CONFIG_MISSING',
        message: (err as Error).message,
        checkedAt,
      };
    }

    try {
      await this.authService.getAccessToken(credentials);
      const response = await this.spApiClient.get(
        credentials,
        AMAZON_API_PATHS.CATALOG_ITEMS,
        request,
        AMAZON_RATE_LIMITS.CATALOG_ITEMS,
        false,
      );

      if (response.status !== 200) {
        return {
          status: 'failed',
          request,
          httpStatus: response.status,
          message: `Amazon responded with HTTP ${response.status}`,
          checkedAt,
        };
      }

      return { status: 'healthy', request, httpStatus: response.status, data: response.data, checkedAt };
    } catch (err) {
      const { classification, reason, httpStatus, amazonErrorCode } =
        err instanceof AmazonAuthError
          ? { classification: err.classification, reason: err.message, httpStatus: undefined, amazonErrorCode: undefined }
          : classifyAmazonAuthFailure(err, AMAZON_API_PATHS.CATALOG_ITEMS);
      this.logger.warn(`Amazon catalog sandbox verification failed (${classification}): ${reason}`, sanitizeErrorForLog(err));
      return {
        status: 'failed',
        request,
        httpStatus,
        errorCode: amazonErrorCode,
        errorClass: classification,
        message: reason,
        checkedAt,
      };
    }
  }
}
