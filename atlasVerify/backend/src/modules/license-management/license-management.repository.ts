import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { LicenseStatus, ILicense, ILicenseHistory } from './interfaces';
import { LicenseFilterDto } from './dto';

@Injectable()
export class LicenseManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Licenses ─────────────────────────────────────────────────────

  async create(data: Partial<ILicense>): Promise<ILicense> {
    return this.prisma.license.create({ data: data as any }) as Promise<ILicense>;
  }

  async findById(id: string): Promise<ILicense | null> {
    return this.prisma.license.findFirst({ where: { id } }) as Promise<ILicense | null>;
  }

  async findByLicenseKeyId(licenseKeyId: string): Promise<ILicense | null> {
    return this.prisma.license.findFirst({ where: { licenseKeyId } }) as Promise<ILicense | null>;
  }

  /** Active-license dedup check for "same scope and plan" — mirrors the identity-lookup pattern used across every other module this session. */
  async findActiveByScopeKeyAndPlan(scopeKey: string, planKey: string): Promise<ILicense | null> {
    return this.prisma.license.findFirst({
      where: { scopeKey, planKey, status: { in: [LicenseStatus.ISSUED, LicenseStatus.ACTIVE, LicenseStatus.SUSPENDED] as any } },
    }) as Promise<ILicense | null>;
  }

  async findAll(workspaceId: string, filter: LicenseFilterDto): Promise<[ILicense[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [{ planKey: { contains: filter.search, mode: 'insensitive' } }, { licenseKeyId: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.license.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.license.count({ where: where as any }),
    ]);

    return [data as ILicense[], total];
  }

  async update(id: string, data: Partial<ILicense>): Promise<ILicense> {
    return this.prisma.license.update({ where: { id }, data: data as any }) as Promise<ILicense>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async findActiveDueForExpiry(before: Date): Promise<ILicense[]> {
    return this.prisma.license.findMany({
      where: { status: LicenseStatus.ACTIVE as any, expiresAt: { lte: before } },
    }) as Promise<ILicense[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<ILicenseHistory>): Promise<ILicenseHistory> {
    return this.prisma.licenseHistory.create({ data: data as any }) as Promise<ILicenseHistory>;
  }

  async findHistory(licenseId: string): Promise<ILicenseHistory[]> {
    return this.prisma.licenseHistory.findMany({ where: { licenseId }, orderBy: { createdAt: 'asc' } }) as Promise<ILicenseHistory[]>;
  }
}
