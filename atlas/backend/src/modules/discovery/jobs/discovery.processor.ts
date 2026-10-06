import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { ColdStartDiscoveryService } from '@modules/product-taxonomy/services/cold-start-discovery.service';
import { DISCOVERY_CONSTANTS } from '../constants';
import { DiscoveryRepository } from '../discovery.repository';
import { MarketplaceAdapterRegistry } from '../adapters/adapter.registry';
import { DiscoveryMode } from '../interfaces';
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
 *   4. For each product with a stable external product ID:
 *      a. Upsert a shared MarketplaceProductCandidate (DB-unique on
 *         marketplace+country+externalProductId — never keyword)
 *      b. Append a MarketplaceSnapshot row
 *      c. Persist DiscoveryResult linked to the candidate
 *      Products with no external ID still get a DiscoveryResult (raw run
 *      output preserved) but no candidate/snapshot.
 *   5. Mark session COMPLETED or FAILED
 *
 * Discovery no longer creates Opportunity records automatically — that is
 * now an explicit user action (`OpportunityService.promoteCandidate`).
 */
@Injectable()
export class DiscoveryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscoveryProcessor.name);
  private worker: Worker<DiscoveryJobData> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly discoveryRepository: DiscoveryRepository,
    private readonly adapterRegistry: MarketplaceAdapterRegistry,
    private readonly coldStartDiscoveryService: ColdStartDiscoveryService,
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
    // Legacy counter name (see schema.prisma comment on
    // DiscoverySession.newOpportunities) — now counts newly discovered
    // MarketplaceProductCandidate rows, not Opportunity rows.
    let newCandidates = 0;
    let duplicatesSkipped = 0;

    try {
      if (session.mode === DiscoveryMode.TREND_COLD_START) {
        // Marketplace-neutral path: no adapter, no MarketplaceProductCandidate,
        // no Opportunity — only Category/ProductConcept/TrendSignal (Prompt 6).
        const result = await this.coldStartDiscoveryService.run();
        await this.discoveryRepository.updateSession(sessionId, {
          status: 'COMPLETED',
          totalDiscovered: result.conceptsProcessed,
          newOpportunities: result.conceptsWithNewEvidence,
          duplicatesSkipped: result.conceptsSkippedOrUnavailable,
          completedAt: new Date(),
        });
        return;
      }

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

        let marketplaceProductCandidateId: string | null = null;
        let isDuplicate = false;

        if (product.externalProductId) {
          const { candidate, created } = await this.discoveryRepository.upsertCandidate({
            marketplaceKey: product.marketplace,
            country: product.country,
            externalProductId: product.externalProductId,
            title: product.title,
            marketplaceCategory: product.category,
          });

          marketplaceProductCandidateId = candidate.id;
          isDuplicate = !created;
          if (created) newCandidates++;
          else duplicatesSkipped++;

          await this.discoveryRepository.createSnapshot({
            candidateId: candidate.id,
            // Amazon Catalog Items (the only live adapter today) returns
            // no rank/price/offer data — real BSR/price wiring is future
            // work (see Prompt 2), never fabricated here.
            salesRank: null,
            price: null,
            offerCount: null,
            source: `${product.marketplace}_discovery`,
            capturedAt: new Date(),
          });
        } else {
          // No stable external ID — this result cannot become a durable
          // candidate (Prompt 3 §5.B). Preserved as raw run output only.
          this.logger.warn(
            `Discovered product for "${product.keyword}" on ${product.marketplace} has no external product ID — skipping candidate/snapshot creation.`,
          );
        }

        await this.discoveryRepository.createResult({
          sessionId,
          opportunityId: null,
          marketplaceProductCandidateId,
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
        newOpportunities: newCandidates,
        duplicatesSkipped,
        completedAt: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Discovery session ${sessionId} failed: ${errorMessage}`);

      await this.discoveryRepository.updateSession(sessionId, {
        status: 'FAILED',
        totalDiscovered,
        newOpportunities: newCandidates,
        duplicatesSkipped,
        errorMessage,
        completedAt: new Date(),
      });

      throw err;
    }
  }
}
