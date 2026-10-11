import { Worker, Job } from 'bullmq';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProfitCalculatorService } from '../profit-calculator.service';
import { ProfitCalculationJobPayload } from '../interfaces';
import { PROFIT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProfitCalculatorWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProfitCalculatorWorker.name);
  private worker: Worker<ProfitCalculationJobPayload> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly calculatorService: ProfitCalculatorService,
  ) {}

  onModuleInit(): void {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      this.worker = new Worker<ProfitCalculationJobPayload>(
        QUEUE_NAMES.PROFIT_CALCULATOR,
        async (job: Job<ProfitCalculationJobPayload>) => this.processJob(job),
        {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls ? {} : undefined,
            db: redisConfig.db,
          },
          concurrency: PROFIT_QUEUE_CONFIG.CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) => {
        this.logger.log(`Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.logger.log('Profit Calculator worker initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.worker = null;
    }
  }

  private async processJob(job: Job<ProfitCalculationJobPayload>): Promise<void> {
    const { calculationId, workspaceId } = job.data;
    this.logger.log(`Processing profit calculation job: ${calculationId}`);

    try {
      await this.calculatorService.executeCalculation(calculationId, workspaceId);
    } catch (error) {
      this.logger.error(
        `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Profit Calculator worker closed');
    }
  }
}
