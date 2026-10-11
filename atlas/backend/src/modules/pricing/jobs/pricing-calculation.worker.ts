import { Worker, Job, WorkerOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PricingCalculationJobPayload, PricingEvent, PricingStatus } from '../interfaces';
import { PricingCalculationEngine } from '../engines/pricing-calculation.engine';
import { PricingStrategyEngine } from '../engines/pricing-strategy.engine';
import { PricingValidationEngine } from '../engines/pricing-validation.engine';
import { PricingRepository } from '../pricing.repository';
import { PricingEventQueue } from './pricing-event.queue';

@Injectable()
export class PricingCalculationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PricingCalculationWorker.name);
  private worker: Worker<PricingCalculationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly calculationEngine: PricingCalculationEngine,
    private readonly strategyEngine: PricingStrategyEngine,
    private readonly validationEngine: PricingValidationEngine,
    private readonly repository: PricingRepository,
    private readonly eventQueue: PricingEventQueue,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: WorkerOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        concurrency: 5,
      };

      this.worker = new Worker<PricingCalculationJobPayload>(
        QUEUE_NAMES.PRICING_CALCULATION,
        async (job: Job<PricingCalculationJobPayload>) => {
          await this.process(job.data);
        },
        opts,
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Pricing calculation completed for ${job.data.pricingRecordId}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Pricing calculation failed for ${job?.data.pricingRecordId}: ${err.message}`),
      );
      this.logger.log('Pricing Calculation worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Pricing Calculation worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async process(payload: PricingCalculationJobPayload): Promise<void> {
    const { pricingRecordId, workspaceId, catalogProductId, marketplaceKey, input } = payload;

    await this.repository.updateRecord(pricingRecordId, workspaceId, {
      status: PricingStatus.CALCULATING,
    });

    try {
      const config = await this.repository.findActiveConfig(workspaceId, marketplaceKey, input.country);
      const strategy = this.strategyEngine.selectBestStrategy(input, config);
      const result = this.calculationEngine.calculate(input, config, strategy);

      const validationReport = this.validationEngine.validate({
        result,
        config,
        marketplaceKey,
        country: input.country ?? 'GLOBAL',
        currency: input.currency ?? config?.currency ?? 'USD',
      });

      await this.repository.updateRecord(pricingRecordId, workspaceId, {
        status: validationReport.isValid ? PricingStatus.CALCULATED : PricingStatus.FAILED,
        strategy,
        totalCost: result.totalCost,
        suggestedSellingPrice: result.suggestedSellingPrice,
        marketplaceSellingPrice: result.marketplaceSellingPrice,
        compareAtPrice: result.compareAtPrice,
        estimatedProfit: result.estimatedProfit,
        estimatedMarginPct: result.estimatedMarginPct,
        estimatedRoi: result.estimatedRoi,
        isValid: validationReport.isValid,
        validationErrors: validationReport.isValid ? [] : validationReport.errors,
        calculationMeta: {
          breakdown: result.breakdown,
          warnings: result.warnings,
          validationWarnings: validationReport.warnings,
          calculatedAt: new Date().toISOString(),
        },
        calculationSource: 'WORKER',
        errorMessage: validationReport.isValid ? null : validationReport.errors.join('; '),
      });

      const event = validationReport.isValid ? PricingEvent.GENERATED : PricingEvent.VALIDATION_FAILED;
      await this.eventQueue.enqueue({
        pricingRecordId,
        catalogProductId,
        workspaceId,
        marketplaceKey,
        event,
        triggeredBy: payload.triggeredBy,
        metadata: {
          strategy,
          marketplaceSellingPrice: result.marketplaceSellingPrice,
          estimatedMarginPct: result.estimatedMarginPct,
        },
      });

      await this.repository.createHistory(pricingRecordId, workspaceId, {
        strategy,
        status: validationReport.isValid ? PricingStatus.CALCULATED : PricingStatus.FAILED,
        snapshotData: {
          input,
          result,
          validationReport,
        },
        changedBy: payload.triggeredBy ?? null,
        changeNote: 'Pricing calculated by worker',
      });

      this.logger.log(
        `Pricing calculated for ${pricingRecordId}: price=${result.marketplaceSellingPrice} valid=${validationReport.isValid}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Pricing calculation failed for ${pricingRecordId}: ${errorMessage}`);

      await this.repository.updateRecord(pricingRecordId, workspaceId, {
        status: PricingStatus.FAILED,
        errorMessage,
        failedAt: new Date(),
        isValid: false,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) await this.worker.close();
  }
}
