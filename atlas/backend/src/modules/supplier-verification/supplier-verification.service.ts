import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupplierVerificationRepository } from './supplier-verification.repository';
import { VerificationQueue } from './jobs/verification.queue';
import { getDefaultVerificationRules, VerificationStatus } from './interfaces';
import type {
  ISupplierVerification,
  IVerificationListResult,
  IVerificationRules,
  IVerificationWithChecks,
} from './interfaces';
import type {
  CheckResultResponseDto,
  ConfigureRulesDto,
  ManualOverrideDto,
  StartVerificationDto,
  VerificationFilterDto,
  VerificationResponseDto,
  VerificationWithChecksResponseDto,
} from './dto';

@Injectable()
export class SupplierVerificationService {
  private readonly logger = new Logger(SupplierVerificationService.name);

  constructor(
    private readonly repository: SupplierVerificationRepository,
    private readonly queue: VerificationQueue,
  ) {}

  // ── Verification Lifecycle ────────────────────────────────────

  async startVerification(
    supplierId: string,
    workspaceId: string,
    dto: StartVerificationDto,
  ): Promise<VerificationResponseDto> {
    // Prevent duplicate in-flight verifications
    const hasPending = await this.repository.hasPendingVerification(supplierId, workspaceId);
    if (hasPending) {
      throw new ConflictException(
        'A verification is already pending or in-progress for this supplier',
      );
    }

    const rules = await this.resolveRules(workspaceId);

    // Mark all previous verifications as not latest
    await this.repository.markPreviousAsNotLatest(supplierId, workspaceId);

    const verification = await this.repository.createVerification({
      supplierId,
      workspaceId,
      status: 'PENDING',
      scoreThreshold: rules.scoreThreshold,
      isLatest: true,
      rulesSnapshot: rules,
    });

    await this.queue.enqueue({
      verificationId: verification.id,
      supplierId,
      workspaceId,
    });

    this.logger.log(`Verification started: ${verification.id} [supplier: ${supplierId}]`);
    return this.toResponseDto(verification);
  }

  async findAll(workspaceId: string, filter: VerificationFilterDto): Promise<IVerificationListResult> {
    const [items, total] = await this.repository.findAllVerifications(workspaceId, filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }

  async findById(id: string, workspaceId: string): Promise<VerificationWithChecksResponseDto> {
    const v = await this.repository.findVerificationWithChecks(id);
    if (!v || v.workspaceId !== workspaceId) {
      throw new NotFoundException(`Verification '${id}' not found`);
    }
    return this.toWithChecksDto(v);
  }

  async findLatestForSupplier(
    supplierId: string,
    workspaceId: string,
  ): Promise<VerificationWithChecksResponseDto> {
    const v = await this.repository.findLatestForSupplier(supplierId, workspaceId);
    if (!v) throw new NotFoundException(`No verification found for supplier '${supplierId}'`);
    return this.toWithChecksDto(v);
  }

  async manualOverride(
    id: string,
    workspaceId: string,
    dto: ManualOverrideDto,
    overriddenBy: string,
  ): Promise<VerificationWithChecksResponseDto> {
    const v = await this.repository.findVerificationWithChecks(id);
    if (!v || v.workspaceId !== workspaceId) {
      throw new NotFoundException(`Verification '${id}' not found`);
    }

    const updated = await this.repository.updateVerification(id, {
      status: dto.status,
      overrideNotes: dto.reason,
      overriddenBy,
      overriddenAt: new Date(),
      completedAt: v.completedAt ?? new Date(),
    });

    // Mark all check results as MANUAL_OVERRIDE
    const checks = await this.repository.findCheckResultsByVerification(id);
    for (const check of checks) {
      await this.repository.updateCheckResult(check.id, {
        status: 'MANUAL_OVERRIDE',
      });
    }

    this.logger.log(
      `Verification ${id} manually overridden to ${dto.status} by ${overriddenBy}`,
    );

    return this.findById(id, workspaceId);
  }

  // ── Rule Configuration ────────────────────────────────────────

  async configureRules(
    workspaceId: string,
    dto: ConfigureRulesDto,
  ): Promise<IVerificationRules> {
    const current = await this.resolveRules(workspaceId);
    const merged: IVerificationRules = {
      ...current,
      ...(dto.businessRegistration && { businessRegistration: dto.businessRegistration }),
      ...(dto.gstVat && { gstVat: dto.gstVat }),
      ...(dto.contactInfo && { contactInfo: dto.contactInfo }),
      ...(dto.websiteAvailability && { websiteAvailability: dto.websiteAvailability }),
      ...(dto.emailValidity && { emailValidity: dto.emailValidity }),
      ...(dto.phoneValidity && { phoneValidity: dto.phoneValidity }),
      ...(dto.businessAge && { businessAge: dto.businessAge }),
      ...(dto.productCatalog && { productCatalog: dto.productCatalog }),
      ...(dto.profileCompleteness && { profileCompleteness: dto.profileCompleteness }),
      ...(dto.scoreThreshold !== undefined && { scoreThreshold: dto.scoreThreshold }),
    };

    await this.repository.upsertRuleConfig(workspaceId, merged);
    this.logger.log(`Verification rules updated for workspace ${workspaceId}`);
    return merged;
  }

  async getRules(workspaceId: string): Promise<IVerificationRules> {
    return this.resolveRules(workspaceId);
  }

  // ── Private ───────────────────────────────────────────────────

  private async resolveRules(workspaceId: string): Promise<IVerificationRules> {
    const stored = await this.repository.getRuleConfig(workspaceId);
    return stored ?? getDefaultVerificationRules();
  }

  private toResponseDto(v: ISupplierVerification): VerificationResponseDto {
    return {
      id: v.id,
      workspaceId: v.workspaceId,
      supplierId: v.supplierId,
      status: v.status,
      score: v.score,
      scoreThreshold: v.scoreThreshold,
      isLatest: v.isLatest,
      overrideNotes: v.overrideNotes,
      overriddenBy: v.overriddenBy,
      overriddenAt: v.overriddenAt?.toISOString() ?? null,
      completedAt: v.completedAt?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }

  private toWithChecksDto(v: IVerificationWithChecks): VerificationWithChecksResponseDto {
    return {
      ...this.toResponseDto(v),
      checkResults: v.checkResults.map((c): CheckResultResponseDto => ({
        id: c.id,
        verificationId: c.verificationId,
        checkName: c.checkName,
        status: c.status,
        weight: c.weight,
        score: c.score,
        message: c.message,
        details: c.details,
        executedAt: c.executedAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
