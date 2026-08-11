import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ISaasAuditArchive, ISaasSecurityIncident, SaasIncidentType } from './interfaces';
import { SaasAuditArchiveFilterDto, SaasIncidentFilterDto } from './dto';

@Injectable()
export class SaasAuditRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Security incidents ───────────────────────────────────────────

  async createIncident(data: Partial<ISaasSecurityIncident>): Promise<ISaasSecurityIncident> {
    return this.prisma.saasSecurityIncident.create({ data: data as any }) as Promise<ISaasSecurityIncident>;
  }

  async findIncidentById(id: string): Promise<ISaasSecurityIncident | null> {
    return this.prisma.saasSecurityIncident.findFirst({ where: { id } }) as Promise<ISaasSecurityIncident | null>;
  }

  async findAllIncidents(filter: SaasIncidentFilterDto): Promise<[ISaasSecurityIncident[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.incidentType) where.incidentType = filter.incidentType;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;
    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.actorId) where.actorId = filter.actorId;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.saasSecurityIncident.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.saasSecurityIncident.count({ where: where as any }),
    ]);

    return [data as ISaasSecurityIncident[], total];
  }

  /** Dedup guard — never raise a second incident for an `AuditLogEntry` the sweep already promoted. */
  async existsIncidentForSourceEntry(sourceAuditLogEntryId: string): Promise<boolean> {
    const count = await this.prisma.saasSecurityIncident.count({ where: { sourceAuditLogEntryId } });
    return count > 0;
  }

  /** Dedup guard for actor-level (not single-entry) incident types, e.g. suspicious cross-tenant access — avoids re-raising while an existing incident for the same actor+type is still open/recent. */
  async findRecentIncidentByActorAndType(actorId: string, incidentType: SaasIncidentType, since: Date): Promise<ISaasSecurityIncident | null> {
    return this.prisma.saasSecurityIncident.findFirst({
      where: { actorId, incidentType, createdAt: { gte: since } },
    }) as Promise<ISaasSecurityIncident | null>;
  }

  async updateIncident(id: string, data: Partial<ISaasSecurityIncident>): Promise<ISaasSecurityIncident> {
    return this.prisma.saasSecurityIncident.update({ where: { id }, data: data as any }) as Promise<ISaasSecurityIncident>;
  }

  // ── Archives ─────────────────────────────────────────────────────

  async createArchive(data: Partial<ISaasAuditArchive>): Promise<ISaasAuditArchive> {
    return this.prisma.saasAuditArchive.create({ data: data as any }) as Promise<ISaasAuditArchive>;
  }

  async findArchiveById(id: string): Promise<ISaasAuditArchive | null> {
    return this.prisma.saasAuditArchive.findFirst({ where: { id } }) as Promise<ISaasAuditArchive | null>;
  }

  async findAllArchives(filter: SaasAuditArchiveFilterDto): Promise<[ISaasAuditArchive[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId) where.workspaceId = filter.workspaceId;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.saasAuditArchive.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.saasAuditArchive.count({ where: where as any }),
    ]);

    return [data as ISaasAuditArchive[], total];
  }

  async updateArchive(id: string, data: Partial<ISaasAuditArchive>): Promise<ISaasAuditArchive> {
    return this.prisma.saasAuditArchive.update({ where: { id }, data: data as any }) as Promise<ISaasAuditArchive>;
  }
}
