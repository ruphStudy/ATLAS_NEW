import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ImpersonationStatus, IAdminActionLog, IAdminNote, IImpersonationSession, ITenantAdminProfile } from './interfaces';
import { AdminActionLogFilterDto, ImpersonationSessionFilterDto } from './dto';

@Injectable()
export class SaasAdministrationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Tenant admin profile ─────────────────────────────────────────

  async findAdminProfile(workspaceId: string): Promise<ITenantAdminProfile | null> {
    return this.prisma.tenantAdminProfile.findFirst({ where: { workspaceId } }) as Promise<ITenantAdminProfile | null>;
  }

  async createAdminProfile(data: Partial<ITenantAdminProfile>): Promise<ITenantAdminProfile> {
    return this.prisma.tenantAdminProfile.create({ data: data as any }) as Promise<ITenantAdminProfile>;
  }

  async updateAdminProfile(id: string, data: Partial<ITenantAdminProfile>): Promise<ITenantAdminProfile> {
    return this.prisma.tenantAdminProfile.update({ where: { id }, data: data as any }) as Promise<ITenantAdminProfile>;
  }

  // ── Notes ────────────────────────────────────────────────────────

  async createNote(data: Partial<IAdminNote>): Promise<IAdminNote> {
    return this.prisma.adminNote.create({ data: data as any }) as Promise<IAdminNote>;
  }

  async findNotes(workspaceId: string): Promise<IAdminNote[]> {
    return this.prisma.adminNote.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }) as Promise<IAdminNote[]>;
  }

  // ── Action log ───────────────────────────────────────────────────

  async createActionLog(data: Partial<IAdminActionLog>): Promise<IAdminActionLog> {
    return this.prisma.adminActionLog.create({ data: data as any }) as Promise<IAdminActionLog>;
  }

  async findAllActionLogs(filter: AdminActionLogFilterDto): Promise<[IAdminActionLog[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.actionType) where.actionType = filter.actionType;
    if (filter.targetWorkspaceId) where.targetWorkspaceId = filter.targetWorkspaceId;
    if (filter.performedBy) where.performedBy = filter.performedBy;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.adminActionLog.count({ where: where as any }),
    ]);

    return [data as IAdminActionLog[], total];
  }

  // ── Impersonation sessions ───────────────────────────────────────

  async createImpersonationSession(data: Partial<IImpersonationSession>): Promise<IImpersonationSession> {
    return this.prisma.impersonationSession.create({ data: data as any }) as Promise<IImpersonationSession>;
  }

  async findImpersonationSessionById(id: string): Promise<IImpersonationSession | null> {
    return this.prisma.impersonationSession.findFirst({ where: { id } }) as Promise<IImpersonationSession | null>;
  }

  async findActiveImpersonationSession(adminUserId: string, targetUserId: string): Promise<IImpersonationSession | null> {
    return this.prisma.impersonationSession.findFirst({
      where: { adminUserId, targetUserId, status: ImpersonationStatus.ACTIVE as any },
    }) as Promise<IImpersonationSession | null>;
  }

  async updateImpersonationSession(id: string, data: Partial<IImpersonationSession>): Promise<IImpersonationSession> {
    return this.prisma.impersonationSession.update({ where: { id }, data: data as any }) as Promise<IImpersonationSession>;
  }

  /** Platform-wide, cross-tenant listing — used by SaaS Audit's security surface as well as this module's own admin history. */
  async findAllImpersonationSessions(filter: ImpersonationSessionFilterDto): Promise<[IImpersonationSession[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.adminUserId) where.adminUserId = filter.adminUserId;
    if (filter.targetWorkspaceId) where.targetWorkspaceId = filter.targetWorkspaceId;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.impersonationSession.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.impersonationSession.count({ where: where as any }),
    ]);

    return [data as IImpersonationSession[], total];
  }
}
