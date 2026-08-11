import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ConnectionTestEvent,
  ConnectionTestHistoryFilter,
  ConnectionTestRequest,
  ConnectionTestResult,
  ConnectionTestTrigger,
  IConnectionTestRecord,
} from '../interfaces';
import { ConnectionTestValidator } from '../validator/connection-test.validator';
import { ConnectionTestResultManager } from '../result/connection-test-result.manager';
import { ConnectionTestEventQueue } from '../events/connection-test-events.queue';
import { ConnectionTestRunner } from '../runner/connection-test.runner';
import { ConnectionTestRepository } from '../repository/connection-test.repository';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceHealthService } from '../../marketplace-health/marketplace-health.service';
import { HealthCheckTrigger, MarketplaceHealthState, HealthConnectionStatus, HealthAuthStatus } from '../../marketplace-health/interfaces';
import { MP_CONN_TEST_ERROR_CODES } from '../constants';

@Injectable()
export class MarketplaceConnectionTestService {
  private readonly logger = new Logger(MarketplaceConnectionTestService.name);

  constructor(
    private readonly validator: ConnectionTestValidator,
    private readonly resultManager: ConnectionTestResultManager,
    private readonly eventQueue: ConnectionTestEventQueue,
    private readonly runner: ConnectionTestRunner,
    private readonly repository: ConnectionTestRepository,
    private readonly registry: MarketplaceProviderRegistry,
    private readonly healthService: MarketplaceHealthService,
  ) {}

  // ── Single Test ───────────────────────────────────────────

  async test(request: ConnectionTestRequest): Promise<ConnectionTestResult> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Connection test validation failed',
        errors: validation.errors,
      });
    }

    // Deduplication
    if (this.resultManager.isInProgress(request.workspaceId, request.providerKey, request.accountId)) {
      const existing = this.resultManager.getInProgressCorrelationId(
        request.workspaceId,
        request.providerKey,
        request.accountId,
      );
      throw new ConflictException({
        message: `A connection test is already in progress for provider '${request.providerKey}'`,
        code: MP_CONN_TEST_ERROR_CODES.DUPLICATE_IN_PROGRESS,
        correlationId: existing,
      });
    }

    const correlationId = request.correlationId ?? uuidv4();
    const trigger = request.trigger ?? ConnectionTestTrigger.MANUAL;

    // Lock
    this.resultManager.lock(request.workspaceId, request.providerKey, correlationId, request.accountId);

    // Emit STARTED
    await this.eventQueue.enqueue({
      event: ConnectionTestEvent.STARTED,
      correlationId,
      workspaceId: request.workspaceId,
      providerKey: request.providerKey,
      accountId: request.accountId ?? null,
      timestamp: new Date(),
    });

    let result: ConnectionTestResult;
    try {
      // Resolve adapter
      if (!this.registry.isRegistered(request.providerKey)) {
        throw new Error(`Provider '${request.providerKey}' is not registered`);
      }
      const adapter = this.registry.get(request.providerKey);

      result = await this.runner.run({
        workspaceId: request.workspaceId,
        providerKey: request.providerKey,
        accountId: request.accountId,
        correlationId,
        adapter,
        capabilityKey: request.capabilityKey,
        timeoutMs: request.timeoutMs,
        trigger,
      });
    } catch (err) {
      // Provider not registered or unexpected error
      result = this.buildProviderNotFoundResult(request, correlationId, err, trigger);
    } finally {
      this.resultManager.unlock(request.workspaceId, request.providerKey, request.accountId);
    }

    // Persist
    await this.resultManager.save(result);

    // Update health monitoring
    await this.syncHealthMonitoring(result);

    // Emit outcome event
    await this.eventQueue.enqueue({
      event: result.success ? ConnectionTestEvent.SUCCEEDED : ConnectionTestEvent.FAILED,
      correlationId,
      workspaceId: result.workspaceId,
      providerKey: result.providerKey,
      accountId: result.accountId ?? null,
      success: result.success,
      errorCode: result.errorCode ?? null,
      errorCategory: result.errorCategory ?? null,
      retryable: result.retryable,
      responseTimeMs: result.responseTimeMs ?? null,
      timestamp: new Date(),
    });

    return result;
  }

  // ── Bulk Test ─────────────────────────────────────────────

  async testAll(workspaceId: string): Promise<ConnectionTestResult[]> {
    const adapters = this.registry.getActive();
    const results = await Promise.allSettled(
      adapters.map((adapter) =>
        this.test({
          workspaceId,
          providerKey: adapter.metadata.providerKey,
          trigger: ConnectionTestTrigger.BULK,
        }),
      ),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<ConnectionTestResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  // ── History ───────────────────────────────────────────────

  async getHistory(
    filter: ConnectionTestHistoryFilter,
  ): Promise<{ items: IConnectionTestRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repository.findHistory(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    return {
      items: items as unknown as IConnectionTestRecord[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id: string, workspaceId: string): Promise<IConnectionTestRecord> {
    const record = await this.resultManager.findById(id, workspaceId);
    if (!record) {
      throw new NotFoundException({
        message: `Connection test result '${id}' not found`,
        code: MP_CONN_TEST_ERROR_CODES.NOT_FOUND,
      });
    }
    return record;
  }

  async getByCorrelationId(correlationId: string): Promise<IConnectionTestRecord> {
    const record = await this.resultManager.findByCorrelationId(correlationId);
    if (!record) {
      throw new NotFoundException({
        message: `Connection test with correlationId '${correlationId}' not found`,
        code: MP_CONN_TEST_ERROR_CODES.NOT_FOUND,
      });
    }
    return record;
  }

  // ── Helpers ───────────────────────────────────────────────

  private async syncHealthMonitoring(result: ConnectionTestResult): Promise<void> {
    try {
      const healthState = result.success
        ? MarketplaceHealthState.HEALTHY
        : result.retryable
          ? MarketplaceHealthState.DEGRADED
          : MarketplaceHealthState.UNHEALTHY;

      await this.healthService.checkProvider({
        workspaceId: result.workspaceId,
        providerKey: result.providerKey,
        accountId: result.accountId,
        trigger: HealthCheckTrigger.SYSTEM,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to sync health monitoring after connection test for '${result.providerKey}': ${(err as Error).message}`,
      );
    }
  }

  private buildProviderNotFoundResult(
    request: ConnectionTestRequest,
    correlationId: string,
    err: unknown,
    trigger: ConnectionTestTrigger,
  ): ConnectionTestResult {
    const { ConnectionStatus, ConnectionAuthStatus, ConnectionCapabilityStatus, ConnectionErrorCategory } =
      require('../interfaces') as typeof import('../interfaces');
    return {
      correlationId,
      workspaceId: request.workspaceId,
      providerKey: request.providerKey.toUpperCase(),
      accountId: request.accountId ?? null,
      success: false,
      connectionStatus: ConnectionStatus.FAILED,
      authStatus: ConnectionAuthStatus.UNKNOWN,
      capabilityStatus: ConnectionCapabilityStatus.NOT_CHECKED,
      responseTimeMs: null,
      errorCode: MP_CONN_TEST_ERROR_CODES.PROVIDER_NOT_REGISTERED,
      errorMessage: `Provider '${request.providerKey}' is not registered or unavailable`,
      errorCategory: ConnectionErrorCategory.CONFIGURATION,
      retryable: false,
      testedAt: new Date(),
      triggeredBy: trigger,
    };
  }
}
