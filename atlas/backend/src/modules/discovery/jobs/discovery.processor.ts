import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { DISCOVERY_CONSTANTS, SCORE_WEIGHTS } from '../constants';
import { DiscoveryRepository } from '../discovery.repository';
import { MarketplaceAdapterRegistry } from '../adapters/adapter.registry';
import type { IDiscoveredProduct } from '../interfaces';
import type { DiscoveryJobData } from './discovery.queue';

/**
 * DiscoveryProcessor
 *
 * BullMQ worker that executes discovery sessions asynchronously.
 *
 * Flow per job:
 *   1. Load session from DB and mark as RUNNING
 *   2. Get marketplace adapter from registry
 *   3. Stream discovered products via async generator
 *   4. For each product:
 *      a. Check for duplicate in opportunities table
 *      b. Create DiscoveryResult record
 *      c. Create Opportunity if not duplicate (with computed final score)
 *   5. Mark session COMPLETED or FAILED
 */
@Injectable()
export class DiscoveryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoveryProcessor.name);
  private worker: Worker<DiscoveryJobData> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly discoveryRepository: DiscoveryRepository,
    private readonly adapterRegistry: MarketplaceAdapterRegistry,
  ) {}

  onModuleInit(): void {
    const { host, port, password } = this.configService.getRedisConfig();

    try {
      this.worker = new Worker<DiscoveryJobData>(
        DISCOVERY_CONSTANTS.QUEUE_NAME,
        (job) => this.process(job),
        {
          connection: { host, port, password, maxRetriesPerRequest: null },
          concurrency: DISCOVERY_CONSTANTS.WORKER_CONCURRENCY,
        },
      );

      this.worker.on('completed', (job) =>
        this.logger.log(`Discovery job completed: ${job.id}`),
      );

      this.worker.on('failed', (job, err) =>
        this.logger.error(`Discovery job failed: ${job?.id} – ${err.message}`),
      );

      this.logger.log('Discovery worker started');
    } catch (err) {
      this.logger.warn(
        `Discovery worker unavailable (Redis not reachable): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close();
    } catch {
      // ignore cleanup errors
    }
  }

  private async process(job: Job<DiscoveryJobData>): Promise<void> {
    const { sessionId, workspaceId } = job.data;

    const session = await this.discoveryRepository.findSessionById(sessionId, workspaceId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    await this.discoveryRepository.updateSession(sessionId, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    let totalDiscovered = 0;
    let newOpportunities = 0;
    let duplicatesSkipped = 0;

    try {
      const adapter = this.adapterRegistry.get(session.marketplace);
      const keywords = session.keywords as string[];
      const categories = session.categories as string[];

      for await (const product of adapter.discover({
        keywords,
        country: session.country,
        categories,
        workspaceId,
      })) {
        // Check if session was cancelled mid-run
        const current = await this.discoveryRepository.findSessionById(sessionId, workspaceId);
        if (current?.status === 'CANCELLED') break;

        const existing = await this.discoveryRepository.findExistingOpportunity(
          workspaceId,
          product.keyword,
          product.marketplace,
        );

        const isDuplicate = existing !== null;
        let opportunityId: string | null = existing?.id ?? null;

        if (!isDuplicate) {
          const finalScore = this.computeFinalScore(product);
          const opp = await this.discoveryRepository.createOpportunityFromProduct({
            workspaceId,
            keyword: product.keyword,
            marketplace: product.marketplace,
            country: product.country,
            category: product.category,
            demandScore: product.estimatedDemandScore,
            competitionScore: product.estimatedCompetitionScore,
            profitScore: product.estimatedProfitScore,
            aiScore: product.estimatedAiScore,
            finalScore,
            status: 'DISCOVERED',
          });
          opportunityId = opp.id;
          newOpportunities++;
        } else {
          duplicatesSkipped++;
        }

        await this.discoveryRepository.createResult({
          sessionId,
          opportunityId,
          keyword: product.keyword,
          marketplace: product.marketplace,
          country: product.country,
          category: product.category,
          isDuplicate,
          rank: product.rank,
          rawData: product.rawData,
        });

        totalDiscovered++;

        const progress = Math.round((totalDiscovered / keywords.length) * 100);
        await job.updateProgress(Math.min(progress, 99));
      }

      await this.discoveryRepository.updateSession(sessionId, {
        status: 'COMPLETED',
        totalDiscovered,
        newOpportunities,
        duplicatesSkipped,
        completedAt: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Discovery session ${sessionId} failed: ${errorMessage}`);

      await this.discoveryRepository.updateSession(sessionId, {
        status: 'FAILED',
        totalDiscovered,
        newOpportunities,
        duplicatesSkipped,
        errorMessage,
        completedAt: new Date(),
      });

      throw err;
    }
  }

  /**
   * Computes a weighted final score from individual dimension scores.
   *
   * Formula:
   *   final = (demand × 0.30) + ((100 − competition) × 0.25)
   *         + (profit × 0.25) + (ai × 0.20)
   *
   * Higher final score = better opportunity.
   */
  private computeFinalScore(product: IDiscoveredProduct): number {
    const { estimatedDemandScore, estimatedCompetitionScore, estimatedProfitScore, estimatedAiScore } =
      product;

    const score =
      estimatedDemandScore * SCORE_WEIGHTS.DEMAND +
      (100 - estimatedCompetitionScore) * SCORE_WEIGHTS.COMPETITION_INVERSE +
      estimatedProfitScore * SCORE_WEIGHTS.PROFIT +
      estimatedAiScore * SCORE_WEIGHTS.AI;

    return Math.round(score * 100) / 100;
  }
}
