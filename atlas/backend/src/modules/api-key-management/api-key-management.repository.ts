import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ApiKeyStatus, IApiKey, IApiKeyHistory } from './interfaces';
import { ApiKeyFilterDto } from './dto';

@Injectable()
export class ApiKeyManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Keys ─────────────────────────────────────────────────────────

  async create(data: Partial<IApiKey>): Promise<IApiKey> {
    return this.prisma.apiKey.create({ data: data as any }) as Promise<IApiKey>;
  }

  async findById(id: string): Promise<IApiKey | null> {
    return this.prisma.apiKey.findFirst({ where: { id } }) as Promise<IApiKey | null>;
  }

  /** The only lookup path used for live request validation — indexed on the unique `keyId` column. */
  async findByKeyId(keyId: string): Promise<IApiKey | null> {
    return this.prisma.apiKey.findFirst({ where: { keyId } }) as Promise<IApiKey | null>;
  }

  async findByScopeKeyAndName(scopeKey: string, name: string): Promise<IApiKey | null> {
    return this.prisma.apiKey.findFirst({ where: { scopeKey, name } }) as Promise<IApiKey | null>;
  }

  async findAll(workspaceId: string, filter: ApiKeyFilterDto): Promise<[IApiKey[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { keyId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.apiKey.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.apiKey.count({ where: where as any }),
    ]);

    return [data as IApiKey[], total];
  }

  async update(id: string, data: Partial<IApiKey>): Promise<IApiKey> {
    return this.prisma.apiKey.update({ where: { id }, data: data as any }) as Promise<IApiKey>;
  }

  /** Best-effort usage tracking — never blocks or fails the request that triggered it. */
  async recordUsageTick(id: string, ipAddress: string | null, metadata: Record<string, unknown> | null): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
        lastUsedIp: ipAddress,
        lastUsedMetadata: metadata as any,
      },
    });
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async findDueForExpiry(before: Date): Promise<IApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { status: ApiKeyStatus.ACTIVE as any, expiresAt: { lte: before } },
    }) as Promise<IApiKey[]>;
  }

  async findGracePeriodExpired(before: Date): Promise<IApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { status: ApiKeyStatus.ACTIVE as any, gracePeriodEndsAt: { lte: before } },
    }) as Promise<IApiKey[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IApiKeyHistory>): Promise<IApiKeyHistory> {
    return this.prisma.apiKeyHistory.create({ data: data as any }) as Promise<IApiKeyHistory>;
  }

  async findHistory(apiKeyId: string): Promise<IApiKeyHistory[]> {
    return this.prisma.apiKeyHistory.findMany({ where: { apiKeyId }, orderBy: { createdAt: 'asc' } }) as Promise<IApiKeyHistory[]>;
  }
}
