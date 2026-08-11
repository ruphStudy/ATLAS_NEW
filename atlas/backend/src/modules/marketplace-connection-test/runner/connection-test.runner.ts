import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectionAuthStatus,
  ConnectionCapabilityStatus,
  ConnectionErrorCategory,
  ConnectionStatus,
  ConnectionTestResult,
  ConnectionTestTrigger,
  ConnectionTestEvent,
} from '../interfaces';
import {
  ERROR_CLASSIFICATION,
  MP_CONN_TEST_ERROR_CODES,
  MP_CONN_TEST_CONSTANTS,
} from '../constants';

/**
 * Raw adapter test response shape.
 * Adapters return this from testConnection().
 */
export interface RawConnectionTestResponse {
  providerKey: string;
  status: string;           // 'HEALTHY' | 'UNHEALTHY' | etc.
  latencyMs?: number;
  message?: string;
  connectionStatus?: string;
  authStatus?: string;
  checkedAt: Date;
}

/**
 * ConnectionTestService (inner runner)
 *
 * Executes the connection test against an adapter, classifies errors,
 * sanitizes output, and builds a ConnectionTestResult.
 * Does NOT persist or emit events — the orchestrator does that.
 */
@Injectable()
export class ConnectionTestRunner {
  private readonly logger = new Logger(ConnectionTestRunner.name);

  async run(opts: {
    workspaceId: string;
    providerKey: string;
    accountId?: string | null;
    correlationId: string;
    adapter: { testConnection: (accountId?: string) => Promise<RawConnectionTestResponse> };
    capabilityKey?: string | null;
    timeoutMs?: number | null;
    trigger?: ConnectionTestTrigger | null;
  }): Promise<ConnectionTestResult> {
    const timeoutMs = Math.min(opts.timeoutMs ?? MP_CONN_TEST_CONSTANTS.DEFAULT_TIMEOUT_MS, MP_CONN_TEST_CONSTANTS.MAX_TIMEOUT_MS);
    const start = Date.now();
    let retries = 0;

    while (retries <= MP_CONN_TEST_CONSTANTS.MAX_RETRIES) {
      try {
        const raw = await this.withTimeout(
          opts.adapter.testConnection(opts.accountId ?? undefined),
          timeoutMs,
        );
        const responseTimeMs = Date.now() - start;
        return this.buildResult(opts, raw, responseTimeMs);
      } catch (err) {
        const classified = this.classify(err);
        if (!classified.retryable || retries >= MP_CONN_TEST_CONSTANTS.MAX_RETRIES) {
          return this.buildFailureResult(opts, err, Date.now() - start);
        }
        retries++;
        this.logger.warn(
          `Connection test retry ${retries}/${MP_CONN_TEST_CONSTANTS.MAX_RETRIES} for ${opts.providerKey}`,
        );
        await this.delay(MP_CONN_TEST_CONSTANTS.RETRY_DELAY_MS);
      }
    }

    return this.buildFailureResult(opts, new Error('Max retries exceeded'), Date.now() - start);
  }

  // ── Build Results ─────────────────────────────────────────

  private buildResult(
    opts: { workspaceId: string; providerKey: string; accountId?: string | null; correlationId: string; trigger?: ConnectionTestTrigger | null; capabilityKey?: string | null },
    raw: RawConnectionTestResponse,
    responseTimeMs: number,
  ): ConnectionTestResult {
    const s = (raw.status ?? '').toUpperCase();
    const isSuccess = s === 'HEALTHY' || s === 'OK' || s === 'CONNECTED';

    const connectionStatus = isSuccess ? ConnectionStatus.CONNECTED : this.mapConnStatus(raw.connectionStatus ?? s);
    const authStatus = isSuccess ? ConnectionAuthStatus.AUTHENTICATED : this.mapAuthStatus(raw.authStatus ?? raw.message);
    const capabilityStatus = opts.capabilityKey ? ConnectionCapabilityStatus.SUPPORTED : ConnectionCapabilityStatus.NOT_CHECKED;

    if (!isSuccess) {
      const classified = this.classifyMessage(raw.message ?? raw.status);
      return {
        correlationId: opts.correlationId,
        workspaceId: opts.workspaceId,
        providerKey: opts.providerKey.toUpperCase(),
        accountId: opts.accountId ?? null,
        success: false,
        connectionStatus,
        authStatus,
        capabilityStatus,
        responseTimeMs,
        errorCode: classified.code,
        errorMessage: this.sanitize(raw.message ?? raw.status),
        errorCategory: classified.category,
        retryable: classified.retryable,
        testedAt: raw.checkedAt,
        triggeredBy: opts.trigger ?? null,
      };
    }

    return {
      correlationId: opts.correlationId,
      workspaceId: opts.workspaceId,
      providerKey: opts.providerKey.toUpperCase(),
      accountId: opts.accountId ?? null,
      success: true,
      connectionStatus,
      authStatus,
      capabilityStatus,
      responseTimeMs,
      errorCode: null,
      errorMessage: null,
      errorCategory: null,
      retryable: false,
      testedAt: raw.checkedAt,
      triggeredBy: opts.trigger ?? null,
    };
  }

  private buildFailureResult(
    opts: { workspaceId: string; providerKey: string; accountId?: string | null; correlationId: string; trigger?: ConnectionTestTrigger | null },
    err: unknown,
    responseTimeMs: number,
  ): ConnectionTestResult {
    const classified = this.classify(err);
    return {
      correlationId: opts.correlationId,
      workspaceId: opts.workspaceId,
      providerKey: opts.providerKey.toUpperCase(),
      accountId: opts.accountId ?? null,
      success: false,
      connectionStatus: classified.category === ConnectionErrorCategory.TIMEOUT ? ConnectionStatus.TIMEOUT : ConnectionStatus.FAILED,
      authStatus: classified.category === ConnectionErrorCategory.AUTHENTICATION ? ConnectionAuthStatus.CREDENTIALS_INVALID : ConnectionAuthStatus.UNKNOWN,
      capabilityStatus: ConnectionCapabilityStatus.NOT_CHECKED,
      responseTimeMs,
      errorCode: classified.code,
      errorMessage: this.sanitize(err instanceof Error ? err.message : String(err)),
      errorCategory: classified.category,
      retryable: classified.retryable,
      testedAt: new Date(),
      triggeredBy: opts.trigger ?? null,
    };
  }

  // ── Classification ────────────────────────────────────────

  private classify(err: unknown): { code: string; category: ConnectionErrorCategory; retryable: boolean } {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    return this.classifyMessage(msg);
  }

  private classifyMessage(msg: string): { code: string; category: ConnectionErrorCategory; retryable: boolean } {
    const lower = msg.toLowerCase();
    for (const rule of ERROR_CLASSIFICATION) {
      if (rule.patterns.some((p) => lower.includes(p))) {
        return { code: rule.code, category: rule.category, retryable: rule.retryable };
      }
    }
    return { code: MP_CONN_TEST_ERROR_CODES.PROVIDER_ERROR, category: ConnectionErrorCategory.UNKNOWN, retryable: false };
  }

  // ── Status Mapping ────────────────────────────────────────

  private mapConnStatus(raw: string): ConnectionStatus {
    const s = raw.toUpperCase();
    if (s === 'CONNECTED' || s === 'OK' || s === 'HEALTHY') return ConnectionStatus.CONNECTED;
    if (s === 'TIMEOUT') return ConnectionStatus.TIMEOUT;
    if (s === 'UNREACHABLE') return ConnectionStatus.UNREACHABLE;
    return ConnectionStatus.FAILED;
  }

  private mapAuthStatus(raw?: string | null): ConnectionAuthStatus {
    if (!raw) return ConnectionAuthStatus.UNKNOWN;
    const s = raw.toLowerCase();
    if (s.includes('authenticated')) return ConnectionAuthStatus.AUTHENTICATED;
    if (s.includes('expired')) return ConnectionAuthStatus.CREDENTIALS_EXPIRED;
    if (s.includes('missing')) return ConnectionAuthStatus.CREDENTIALS_MISSING;
    if (s.includes('invalid') || s.includes('unauthorized') || s.includes('401')) return ConnectionAuthStatus.CREDENTIALS_INVALID;
    if (s.includes('unauthenticated')) return ConnectionAuthStatus.UNAUTHENTICATED;
    return ConnectionAuthStatus.UNKNOWN;
  }

  // ── Helpers ───────────────────────────────────────────────

  private sanitize(message: string): string {
    return message
      .replace(/secret[=:\s]+\S+/gi, 'secret=***')
      .replace(/token[=:\s]+\S+/gi, 'token=***')
      .replace(/password[=:\s]+\S+/gi, 'password=***')
      .replace(/key[=:\s]+\S+/gi, 'key=***')
      .replace(/authorization[=:\s]+\S+/gi, 'authorization=***')
      .substring(0, 500);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
