import { Injectable, Logger } from '@nestjs/common';
import { AdapterMetricEvent } from './adapter.types';

/**
 * AdapterMetricsRecorder
 *
 * Lightweight, synchronous metrics recorder for adapter operations.
 * Accumulates counters and histogram-style data in memory.
 * In production, integrate with OpenTelemetry, Prometheus, DataDog, etc.
 */
@Injectable()
export class AdapterMetricsRecorder {
  private readonly logger = new Logger(AdapterMetricsRecorder.name);

  private readonly counters = new Map<string, number>();
  private readonly latencies = new Map<string, number[]>();

  record(event: AdapterMetricEvent): void {
    const prefix = `${event.providerCode}.${event.capability}`;
    const resultKey = event.success ? 'success' : 'failure';

    // Increment counters
    this.inc(`${prefix}.total`);
    this.inc(`${prefix}.${resultKey}`);
    if (event.errorCode) this.inc(`${prefix}.error.${event.errorCode}`);
    if (event.httpStatus) this.inc(`${prefix}.http.${event.httpStatus}`);

    // Record latency
    const latencyBucket = this.latencies.get(`${prefix}.latencyMs`) ?? [];
    latencyBucket.push(event.durationMs);
    this.latencies.set(`${prefix}.latencyMs`, latencyBucket);

    this.logger.debug(
      `[METRIC] ${prefix} ${resultKey} ${event.durationMs}ms attempt=${event.attempt}`,
    );
  }

  getCounter(key: string): number {
    return this.counters.get(key) ?? 0;
  }

  getP50(key: string): number | null {
    return this.percentile(key, 0.5);
  }

  getP95(key: string): number | null {
    return this.percentile(key, 0.95);
  }

  getP99(key: string): number | null {
    return this.percentile(key, 0.99);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }

  private inc(key: string): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  private percentile(key: string, p: number): number | null {
    const values = this.latencies.get(key);
    if (!values || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * p);
    return sorted[idx] ?? null;
  }
}
