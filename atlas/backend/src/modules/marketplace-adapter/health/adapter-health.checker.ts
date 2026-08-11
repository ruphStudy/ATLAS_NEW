import { Injectable, Logger } from '@nestjs/common';
import { AdapterFactory } from '../factory/adapter.factory';
import {
  IAdapterHealthCheck,
  IAdapterConnectionTest,
  AdapterStatus,
} from '../interfaces';

@Injectable()
export class AdapterHealthChecker {
  private readonly logger = new Logger(AdapterHealthChecker.name);

  constructor(private readonly adapterFactory: AdapterFactory) {}

  async checkHealth(
    provider: string,
    accountId: string,
  ): Promise<IAdapterHealthCheck> {
    try {
      const adapter = this.adapterFactory.get(provider, accountId);

      if (!adapter) {
        return {
          status: AdapterStatus.DISCONNECTED,
          lastChecked: new Date(),
          errors: [
            {
              code: 'ADAPTER_NOT_FOUND',
              message: `Adapter for ${provider}:${accountId} not found`,
            },
          ],
        };
      }

      return await adapter.healthCheck();
    } catch (error) {
      this.logger.error(
        `Health check failed for ${provider}:${accountId}`,
        error,
      );
      return {
        status: AdapterStatus.ERROR,
        lastChecked: new Date(),
        errors: [
          {
            code: 'HEALTH_CHECK_ERROR',
            message: error.message,
          },
        ],
      };
    }
  }

  async testConnection(
    provider: string,
    accountId: string,
  ): Promise<IAdapterConnectionTest> {
    try {
      const adapter = this.adapterFactory.get(provider, accountId);

      if (!adapter) {
        return {
          success: false,
          provider,
          accountId,
          testedAt: new Date(),
          responseTime: 0,
          error: {
            code: 'ADAPTER_NOT_FOUND',
            message: `Adapter for ${provider}:${accountId} not found`,
          },
        };
      }

      return await adapter.testConnection();
    } catch (error) {
      this.logger.error(
        `Connection test failed for ${provider}:${accountId}`,
        error,
      );
      return {
        success: false,
        provider,
        accountId,
        testedAt: new Date(),
        responseTime: 0,
        error: {
          code: 'CONNECTION_TEST_ERROR',
          message: error.message,
        },
      };
    }
  }

  async checkAllHealth(): Promise<
    Map<string, { provider: string; accountId: string; health: IAdapterHealthCheck }>
  > {
    const results = new Map();
    // Implementation would iterate over all active adapters
    return results;
  }
}
