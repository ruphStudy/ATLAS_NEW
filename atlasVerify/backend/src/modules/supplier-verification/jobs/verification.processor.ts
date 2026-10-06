import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { VERIFICATION_CONSTANTS } from '../constants';
import { SupplierVerificationRepository } from '../supplier-verification.repository';
import { VerificationCheckRegistry } from '../checks/check.registry';
import { VerificationStatus, VerificationCheckStatus } from '../interfaces';
import type { ICheckResult, IVerificationRules } from '../interfaces';
import type { VerificationJobData } from './verification.queue';

@Injectable()
export class VerificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VerificationProcessor.name);
  private worker: Worker<VerificationJobData> | null = null;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly repository: SupplierVerificationRepository,
    private readonly checkRegistry: VerificationCheckRegistry,
  ) {}

  onModuleInit(): void {
    const { host, port, password } = this.configService.getRedisConfig();
    try {
      this.worker = new Worker<VerificationJobData>(
        VERIFICATION_CONSTANTS.QUEUE_NAME,
        (job) => this.process(job),
        {
          connection: { host, port, password, maxRetriesPerRequest: null },
          concurrency: VERIFICATION_CONSTANTS.WORKER_CONCURRENCY,
        },
      );
      this.worker.on('completed', (j) => this.logger.log(`Verification job completed: ${j.id}`));
      this.worker.on('failed', (j, err) =>
        this.logger.error(`Verification job failed: ${j?.id} – ${err.message}`),
      );
      this.logger.log('Verification worker started');
    } catch (err) {
      this.logger.warn(`Verification worker unavailable: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try { await this.worker?.close(); } catch { /* ignore */ }
  }

  private async process(job: Job<VerificationJobData>): Promise<void> {
    const { verificationId, supplierId, workspaceId } = job.data;

    const verification = await this.repository.findVerificationById(verificationId);
    if (!verification) throw new Error(`Verification ${verificationId} not found`);

    await this.repository.updateVerification(verificationId, {
      status: 'IN_PROGRESS',
    });

    try {
      const supplier = await this.repository.findSupplierForVerification(supplierId);
      if (!supplier) throw new Error(`Supplier ${supplierId} not found`);

      const rules = (verification.rulesSnapshot as unknown as IVerificationRules);
      const checks = this.checkRegistry.getAll();
      const context = { workspaceId, rules };

      const checkResults: Array<{
        checkName: string;
        result: ICheckResult;
        weight: number;
        required: boolean;
        enabled: boolean;
      }> = [];

      for (const check of checks) {
        const ruleKey = this.checkNameToRuleKey(check.checkName);
        const rule = rules[ruleKey as keyof IVerificationRules];
        const ruleConfig = typeof rule === 'object' && rule !== null ? rule as { enabled: boolean; weight: number; required: boolean } : null;
        const enabled = ruleConfig?.enabled ?? true;
        const weight = ruleConfig?.weight ?? check.defaultWeight;
        const required = ruleConfig?.required ?? check.defaultRequired;

        if (!enabled) {
          await this.repository.createCheckResult({
            verificationId,
            checkName: check.checkName,
            status: 'SKIPPED',
            weight,
            score: 0,
            message: 'Check disabled by workspace rules',
            details: {},
            executedAt: new Date(),
          });
          checkResults.push({ checkName: check.checkName, result: { passed: false, score: 0, message: 'Skipped', details: {} }, weight, required: false, enabled: false });
          continue;
        }

        const result = await check.execute(supplier, context);
        const status: VerificationCheckStatus = result.passed ? VerificationCheckStatus.PASSED : VerificationCheckStatus.FAILED;

        await this.repository.createCheckResult({
          verificationId,
          checkName: check.checkName,
          status,
          weight,
          score: result.score,
          message: result.message,
          details: result.details,
          executedAt: new Date(),
        });

        checkResults.push({ checkName: check.checkName, result, weight, required, enabled: true });
        await job.updateProgress(Math.round((checkResults.length / checks.length) * 90));
      }

      const { finalScore, finalStatus } = this.computeFinalOutcome(checkResults, rules.scoreThreshold ?? VERIFICATION_CONSTANTS.DEFAULT_SCORE_THRESHOLD);

      await this.repository.updateVerification(verificationId, {
        status: finalStatus,
        score: finalScore,
        completedAt: new Date(),
      });

      this.logger.log(`Verification ${verificationId}: ${finalStatus} (score: ${finalScore})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Verification ${verificationId} failed: ${msg}`);
      await this.repository.updateVerification(verificationId, {
        status: 'REVIEW_REQUIRED',
        completedAt: new Date(),
      });
      throw err;
    }
  }

  private computeFinalOutcome(
    results: Array<{ result: ICheckResult; weight: number; required: boolean; enabled: boolean }>,
    threshold: number,
  ): { finalScore: number; finalStatus: VerificationStatus } {
    const enabledResults = results.filter((r) => r.enabled);

    // Any required check failure → REJECTED immediately
    const hasRequiredFailure = enabledResults.some((r) => r.required && !r.result.passed);
    if (hasRequiredFailure) {
      return { finalScore: 0, finalStatus: VerificationStatus.REJECTED };
    }

    const totalWeight = enabledResults.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) return { finalScore: 0, finalStatus: VerificationStatus.REVIEW_REQUIRED };

    const weightedPassed = enabledResults
      .filter((r) => r.result.passed)
      .reduce((s, r) => s + r.weight, 0);

    const finalScore = Math.round((weightedPassed / totalWeight) * 100 * 100) / 100;

    let finalStatus: VerificationStatus;
    if (finalScore >= threshold) {
      finalStatus = VerificationStatus.VERIFIED;
    } else if (finalScore >= threshold - VERIFICATION_CONSTANTS.REVIEW_REQUIRED_BUFFER) {
      finalStatus = VerificationStatus.REVIEW_REQUIRED;
    } else {
      finalStatus = VerificationStatus.REJECTED;
    }

    return { finalScore, finalStatus };
  }

  private checkNameToRuleKey(checkName: string): string {
    // business_registration → businessRegistration
    return checkName.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  }
}
