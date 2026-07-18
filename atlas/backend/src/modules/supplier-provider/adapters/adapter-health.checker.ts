import { Injectable, Logger } from '@nestjs/common';
import { AdapterHealthStatus, AdapterMetadata, IntegrationStrategy } from './adapter.types';
import { AdapterMetricsRecorder } from './adapter-metrics.recorder';
import { withTimeout } from './adapter-retry.utils';

/**
 * AdapterHealthChecker
 *
 * Provides health and connection check infrastructure shared across all adapters.
 * Concrete adapters provide the ping function; this class handles timeout + metrics.
 */
@Injectable()
export class AdapterHealthChecker {
  private readonly logger = new Logger(AdapterHealthChecker.name);
  private readonly HEALTH_TIMEOUT_MS = 10_000;

  constructor(private readonly metrics: AdapterMetricsRecorder) {}

  async check(
    metadata: AdapterMetadata,
    strategy: IntegrationStrategy,
    workspaceId: string,
    ping: () => Promise<void>,
  ): Promise<AdapterHealthStatus> {
    const start = Date.now();
    try {
      await withTimeout(ping, this.HEALTH_TIMEOUT_MS, metadata.providerCode);
      const latencyMs = Date.now() - start;

      this.logger.log(`[${metadata.providerCode}] Health OK (${latencyMs}ms)`);

      return {
        providerCode: metadata.providerCode,
        status: 'HEALTHY',
        latencyMs,
        message: null,
        checkedAt: new Date(),
        strategy,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`[${metadata.providerCode}] Health UNHEALTHY: ${message}`);

      return {
        providerCode: metadata.providerCode,
        status: 'UNHEALTHY',
        latencyMs,
        message,
        checkedAt: new Date(),
        strategy,
        details: { error: message },
      };
    }
  }

  async testConnection(
    metadata: AdapterMetadata,
    strategy: IntegrationStrategy,
    workspaceId: string,
    ping: () => Promise<Record<string, unknown>>,
  ): Promise<AdapterHealthStatus> {
    const start = Date.now();
    try {
      const details = await withTimeout(() => ping(), this.HEALTH_TIMEOUT_MS, metadata.providerCode);
      const latencyMs = Date.now() - start;

      return {
        providerCode: metadata.providerCode,
        status: 'HEALTHY',
        latencyMs,
        message: 'Connection successful',
        checkedAt: new Date(),
        strategy,
        details,
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      const message = error instanceof Error ? error.message : 'Connection failed';
      return {
        providerCode: metadata.providerCode,
        status: 'UNHEALTHY',
        latencyMs,
        message,
        checkedAt: new Date(),
        strategy,
        details: { error: message },
      };
    }
  }
}
