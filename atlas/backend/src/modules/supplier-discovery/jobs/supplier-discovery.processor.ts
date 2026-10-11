import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { SUPPLIER_DISCOVERY_CONSTANTS } from '../constants';
import { SupplierDiscoveryRepository } from '../supplier-discovery.repository';
import { SupplierProviderRegistry } from '../providers/provider.registry';
import type { SupplierDiscoveryJobData } from './supplier-discovery.queue';

@Injectable()
export class SupplierDiscoveryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupplierDiscoveryProcessor.name);
  private worker: Worker<SupplierDiscoveryJobData> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly repository: SupplierDiscoveryRepository,
    private readonly providerRegistry: SupplierProviderRegistry,
  ) {}

  onModuleInit(): void {
    const { host, port, password, tls } = this.configService.getRedisConfig();
    try {
      this.worker = new Worker<SupplierDiscoveryJobData>(
        SUPPLIER_DISCOVERY_CONSTANTS.QUEUE_NAME,
        (job) => this.process(job),
        {
          connection: { host, port, password, maxRetriesPerRequest: null, tls: tls ? {} : undefined },
          concurrency: SUPPLIER_DISCOVERY_CONSTANTS.WORKER_CONCURRENCY,
        },
      );
      this.worker.on('completed', (job) =>
        this.logger.log(`Supplier discovery job completed: ${job.id}`),
      );
      this.worker.on('failed', (job, err) =>
        this.logger.error(`Supplier discovery job failed: ${job?.id} – ${err.message}`),
      );
      this.logger.log('Supplier discovery worker started');
    } catch (err) {
      this.logger.warn(`Supplier discovery worker unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.worker?.close();
    } catch { /* ignore */ }
  }

  private async process(job: Job<SupplierDiscoveryJobData>): Promise<void> {
    const { sessionId, workspaceId } = job.data;

    const session = await this.repository.findSessionById(sessionId, workspaceId);
    if (!session) throw new Error(`Supplier discovery session ${sessionId} not found`);

    await this.repository.updateSession(sessionId, {
      status: 'RUNNING',
      startedAt: new Date(),
    });

    let totalDiscovered = 0;
    let newSuppliers = 0;
    let duplicatesSkipped = 0;

    try {
      const provider = this.providerRegistry.get(session.provider);

      for await (const discovered of provider.discover({
        keyword: session.keyword,
        country: session.country,
        category: session.category ?? undefined,
        workspaceId,
      })) {
        // Check cancellation mid-run
        const current = await this.repository.findSessionById(sessionId, workspaceId);
        if (current?.status === 'CANCELLED') break;

        const existing = await this.repository.findDuplicateSupplier(
          workspaceId,
          discovered.provider,
          discovered.providerSupplierId,
        );

        const isDuplicate = existing !== null;
        let supplierId: string | null = existing?.id ?? null;

        if (!isDuplicate) {
          const supplier = await this.repository.createSupplierFromDiscovery({
            workspaceId,
            name: discovered.name,
            provider: discovered.provider,
            providerSupplierId: discovered.providerSupplierId,
            country: discovered.country,
            city: discovered.city,
            website: discovered.website,
            contactEmail: discovered.contactEmail,
            contactPhone: discovered.contactPhone,
            tier: 'UNVERIFIED',
            status: 'PENDING_REVIEW',
            categories: discovered.categories,
            minOrderQuantity: discovered.minOrderQuantity,
            avgLeadTimeDays: discovered.avgLeadTimeDays,
            overallRating: discovered.overallRating,
            rawData: discovered.rawData,
          });
          supplierId = supplier.id;
          newSuppliers++;
        } else {
          duplicatesSkipped++;
        }

        await this.repository.createResult({ sessionId, supplierId, isDuplicate, rawData: discovered.rawData });
        totalDiscovered++;

        await job.updateProgress(Math.min(Math.round(totalDiscovered * 10), 99));
      }

      await this.repository.updateSession(sessionId, {
        status: 'COMPLETED',
        totalDiscovered,
        newSuppliers,
        duplicatesSkipped,
        completedAt: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Supplier discovery session ${sessionId} failed: ${errorMessage}`);
      await this.repository.updateSession(sessionId, {
        status: 'FAILED',
        totalDiscovered,
        newSuppliers,
        duplicatesSkipped,
        errorMessage,
        completedAt: new Date(),
      });
      throw err;
    }
  }
}
