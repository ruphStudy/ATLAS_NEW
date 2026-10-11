import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '@database/prisma.service';
import { ConfigurationService } from '@config/configuration.service';
import { HEALTH_CONSTANTS, HealthStatus, ServiceStatus } from './constants';
import type {
  IHealthCheckResult,
  ILivenessResult,
  IReadinessResult,
  IServiceCheckResult,
} from './interfaces';

/**
 * HealthService
 *
 * Orchestrates all infrastructure health checks.
 * Owns a dedicated Redis client used solely for health probes.
 *
 * Architecture rules:
 *   - Never throws – all errors are caught and returned as DOWN status.
 *   - Never imports business modules.
 *   - All checks run concurrently with Promise.all.
 */
@Injectable()
export class HealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigurationService,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    this.initRedisClient();
    this.logger.log('HealthService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.destroyRedisClient();
  }

  // ── Public Methods ───────────────────────────────────────────

  /**
   * Returns a full health report including all service statuses.
   * Never throws – returns DEGRADED/DOWN if services are unavailable.
   */
  async getHealth(): Promise<IHealthCheckResult> {
    const start = Date.now();
    this.logger.debug('Full health check initiated');

    const [dbResult, redisResult] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = this.resolveStatus(dbResult.status, redisResult.status);
    const durationMs = Date.now() - start;

    if (status !== HealthStatus.UP) {
      this.logger.warn(
        `Health check: ${status} (${durationMs}ms) – DB: ${dbResult.status}, Redis: ${redisResult.status}`,
      );
    } else {
      this.logger.debug(`Health check: ${status} (${durationMs}ms)`);
    }

    const { env } = this.configService.getAppConfig();
    const { version } = this.configService.getSwaggerConfig();

    return {
      status,
      application: HEALTH_CONSTANTS.APP_NAME,
      version,
      environment: env,
      uptime: this.formatUptime(process.uptime()),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult.status,
        redis: redisResult.status,
      },
    };
  }

  /**
   * Liveness probe – synchronous.
   * Returns true as long as the Node.js process is running.
   */
  getLiveness(): ILivenessResult {
    return {
      alive: true,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness probe – checks whether the application can serve traffic.
   * Returns ready=false with status 503 if any service is unavailable.
   */
  async getReadiness(): Promise<IReadinessResult> {
    const [dbResult, redisResult] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = this.resolveStatus(dbResult.status, redisResult.status);
    const ready = status === HealthStatus.UP;

    if (!ready) {
      this.logger.warn(
        `Readiness probe FAILED – DB: ${dbResult.status}, Redis: ${redisResult.status}`,
      );
    }

    return {
      ready,
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbResult.status,
        redis: redisResult.status,
      },
    };
  }

  // ── Private Checks ───────────────────────────────────────────

  private async checkDatabase(): Promise<IServiceCheckResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: ServiceStatus.UP, responseTimeMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown database error';
      this.logger.error(`Database health check failed: ${message}`);
      return {
        status: ServiceStatus.DOWN,
        responseTimeMs: Date.now() - start,
        error: message,
      };
    }
  }

  private async checkRedis(): Promise<IServiceCheckResult> {
    const start = Date.now();

    if (!this.redisClient) {
      return {
        status: ServiceStatus.DOWN,
        responseTimeMs: Date.now() - start,
        error: 'Redis client not initialized',
      };
    }

    try {
      const pong = await Promise.race<string>([
        this.redisClient.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis PING timed out')),
            HEALTH_CONSTANTS.CHECK_TIMEOUT_MS,
          ),
        ),
      ]);

      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING response: ${pong}`);
      }

      return { status: ServiceStatus.UP, responseTimeMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown Redis error';
      this.logger.error(`Redis health check failed: ${message}`);
      return {
        status: ServiceStatus.DOWN,
        responseTimeMs: Date.now() - start,
        error: message,
      };
    }
  }

  // ── Private Helpers ──────────────────────────────────────────

  private initRedisClient(): void {
    const { host, port, password, tls } = this.configService.getRedisConfig();

    this.redisClient = new Redis({
      host,
      port,
      password,
      tls: tls ? {} : undefined,
      connectTimeout: HEALTH_CONSTANTS.CHECK_TIMEOUT_MS,
      commandTimeout: HEALTH_CONSTANTS.CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    this.redisClient.on('error', (err: Error) => {
      // Log but never throw – health check handles failures gracefully
      this.logger.warn(`Redis health client error: ${err.message}`);
    });
  }

  private async destroyRedisClient(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch {
        this.redisClient.disconnect();
      } finally {
        this.redisClient = null;
      }
    }
  }

  /**
   * Determines overall status from individual service statuses.
   *
   * UP       – both UP
   * DOWN     – both DOWN
   * DEGRADED – partial failure (one UP, one DOWN)
   */
  private resolveStatus(db: ServiceStatus, redis: ServiceStatus): HealthStatus {
    if (db === ServiceStatus.UP && redis === ServiceStatus.UP) return HealthStatus.UP;
    if (db === ServiceStatus.DOWN && redis === ServiceStatus.DOWN) return HealthStatus.DOWN;
    return HealthStatus.DEGRADED;
  }

  /**
   * Formats seconds into a human-readable uptime string.
   * e.g. 8315 → "2h 18m 35s"
   */
  private formatUptime(uptimeSeconds: number): string {
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    const s = Math.floor(uptimeSeconds % 60);

    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ') || '0s';
  }
}
