import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  SsoConnectionStatus,
  SsoLoginRequestStatus,
  ISsoConnection,
  ISsoGroupRoleMapping,
  ISsoHistory,
  ISsoIdentity,
  ISsoLoginRequest,
} from './interfaces';
import { SsoConnectionFilterDto } from './dto';

@Injectable()
export class SsoFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Connections ──────────────────────────────────────────────────

  async createConnection(data: Partial<ISsoConnection>): Promise<ISsoConnection> {
    return this.prisma.ssoConnection.create({ data: data as any }) as Promise<ISsoConnection>;
  }

  async findConnectionById(id: string): Promise<ISsoConnection | null> {
    return this.prisma.ssoConnection.findFirst({ where: { id } }) as Promise<ISsoConnection | null>;
  }

  async findConnectionByScopeKeyAndName(scopeKey: string, name: string): Promise<ISsoConnection | null> {
    return this.prisma.ssoConnection.findFirst({ where: { scopeKey, name } }) as Promise<ISsoConnection | null>;
  }

  async findAllConnections(workspaceId: string, filter: SsoConnectionFilterDto): Promise<[ISsoConnection[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.protocol) where.protocol = filter.protocol;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [{ name: { contains: filter.search, mode: 'insensitive' } }, { issuer: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.ssoConnection.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.ssoConnection.count({ where: where as any }),
    ]);

    return [data as ISsoConnection[], total];
  }

  async updateConnection(id: string, data: Partial<ISsoConnection>): Promise<ISsoConnection> {
    return this.prisma.ssoConnection.update({ where: { id }, data: data as any }) as Promise<ISsoConnection>;
  }

  /**
   * Home-realm discovery lookup — deliberately GLOBAL (no `workspaceId` filter): a visitor identifies
   * themselves only by email before any tenant context exists, so the domain itself must resolve the
   * tenant, not the other way around.
   */
  async findActiveConnectionByDomain(domain: string): Promise<ISsoConnection | null> {
    return this.prisma.ssoConnection.findFirst({
      where: { status: SsoConnectionStatus.ACTIVE as any, domains: { has: domain } },
    }) as Promise<ISsoConnection | null>;
  }

  /** Global overlap check so a domain never routes ambiguously to more than one connection. */
  async findConnectionsWithAnyDomain(domains: string[], excludeConnectionId?: string): Promise<ISsoConnection[]> {
    return this.prisma.ssoConnection.findMany({
      where: {
        domains: { hasSome: domains },
        ...(excludeConnectionId ? { id: { not: excludeConnectionId } } : {}),
      },
    }) as Promise<ISsoConnection[]>;
  }

  // ── Group → role mappings ────────────────────────────────────────

  async createGroupRoleMapping(data: Partial<ISsoGroupRoleMapping>): Promise<ISsoGroupRoleMapping> {
    return this.prisma.ssoGroupRoleMapping.create({ data: data as any }) as Promise<ISsoGroupRoleMapping>;
  }

  async findGroupRoleMappingById(id: string): Promise<ISsoGroupRoleMapping | null> {
    return this.prisma.ssoGroupRoleMapping.findFirst({ where: { id } }) as Promise<ISsoGroupRoleMapping | null>;
  }

  async findGroupRoleMappingsByConnection(connectionId: string): Promise<ISsoGroupRoleMapping[]> {
    return this.prisma.ssoGroupRoleMapping.findMany({ where: { connectionId }, orderBy: { priority: 'desc' } }) as Promise<ISsoGroupRoleMapping[]>;
  }

  async findGroupRoleMappingByConnectionAndGroup(connectionId: string, externalGroup: string): Promise<ISsoGroupRoleMapping | null> {
    return this.prisma.ssoGroupRoleMapping.findFirst({ where: { connectionId, externalGroup } }) as Promise<ISsoGroupRoleMapping | null>;
  }

  async updateGroupRoleMapping(id: string, data: Partial<ISsoGroupRoleMapping>): Promise<ISsoGroupRoleMapping> {
    return this.prisma.ssoGroupRoleMapping.update({ where: { id }, data: data as any }) as Promise<ISsoGroupRoleMapping>;
  }

  async deleteGroupRoleMapping(id: string): Promise<void> {
    await this.prisma.ssoGroupRoleMapping.delete({ where: { id } });
  }

  // ── Identities ───────────────────────────────────────────────────

  async createIdentity(data: Partial<ISsoIdentity>): Promise<ISsoIdentity> {
    return this.prisma.ssoIdentity.create({ data: data as any }) as Promise<ISsoIdentity>;
  }

  async findIdentityById(id: string): Promise<ISsoIdentity | null> {
    return this.prisma.ssoIdentity.findFirst({ where: { id } }) as Promise<ISsoIdentity | null>;
  }

  async findIdentityByConnectionAndExternalUserId(connectionId: string, externalUserId: string): Promise<ISsoIdentity | null> {
    return this.prisma.ssoIdentity.findFirst({ where: { connectionId, externalUserId } }) as Promise<ISsoIdentity | null>;
  }

  async updateIdentity(id: string, data: Partial<ISsoIdentity>): Promise<ISsoIdentity> {
    return this.prisma.ssoIdentity.update({ where: { id }, data: data as any }) as Promise<ISsoIdentity>;
  }

  // ── Login requests ───────────────────────────────────────────────

  async createLoginRequest(data: Partial<ISsoLoginRequest>): Promise<ISsoLoginRequest> {
    return this.prisma.ssoLoginRequest.create({ data: data as any }) as Promise<ISsoLoginRequest>;
  }

  async findLoginRequestByState(state: string): Promise<ISsoLoginRequest | null> {
    return this.prisma.ssoLoginRequest.findFirst({ where: { state } }) as Promise<ISsoLoginRequest | null>;
  }

  async updateLoginRequest(id: string, data: Partial<ISsoLoginRequest>): Promise<ISsoLoginRequest> {
    return this.prisma.ssoLoginRequest.update({ where: { id }, data: data as any }) as Promise<ISsoLoginRequest>;
  }

  // ── Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session) ──

  async findExpiredPendingLoginRequests(before: Date): Promise<ISsoLoginRequest[]> {
    return this.prisma.ssoLoginRequest.findMany({
      where: { status: SsoLoginRequestStatus.PENDING as any, expiresAt: { lte: before } },
    }) as Promise<ISsoLoginRequest[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<ISsoHistory>): Promise<ISsoHistory> {
    return this.prisma.ssoHistory.create({ data: data as any }) as Promise<ISsoHistory>;
  }

  async findHistory(connectionId: string): Promise<ISsoHistory[]> {
    return this.prisma.ssoHistory.findMany({ where: { connectionId }, orderBy: { createdAt: 'asc' } }) as Promise<ISsoHistory[]>;
  }
}
