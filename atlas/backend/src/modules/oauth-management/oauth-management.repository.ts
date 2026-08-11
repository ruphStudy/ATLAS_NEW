import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  OAuthConnectionStatus,
  OAuthAuthorizationRequestStatus,
  IOAuthAuthorizationRequest,
  IOAuthClient,
  IOAuthConnection,
  IOAuthHistory,
} from './interfaces';
import { OAuthClientFilterDto, OAuthConnectionFilterDto } from './dto';

@Injectable()
export class OAuthManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Clients ──────────────────────────────────────────────────────

  async createClient(data: Partial<IOAuthClient>): Promise<IOAuthClient> {
    return this.prisma.oAuthClient.create({ data: data as any }) as Promise<IOAuthClient>;
  }

  async findClientById(id: string): Promise<IOAuthClient | null> {
    return this.prisma.oAuthClient.findFirst({ where: { id } }) as Promise<IOAuthClient | null>;
  }

  async findClientByScopeKeyAndName(scopeKey: string, name: string): Promise<IOAuthClient | null> {
    return this.prisma.oAuthClient.findFirst({ where: { scopeKey, name } }) as Promise<IOAuthClient | null>;
  }

  async findAllClients(workspaceId: string, filter: OAuthClientFilterDto): Promise<[IOAuthClient[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.status) where.status = filter.status;
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.search) {
      where.OR = [{ name: { contains: filter.search, mode: 'insensitive' } }, { clientId: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.oAuthClient.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.oAuthClient.count({ where: where as any }),
    ]);

    return [data as IOAuthClient[], total];
  }

  async updateClient(id: string, data: Partial<IOAuthClient>): Promise<IOAuthClient> {
    return this.prisma.oAuthClient.update({ where: { id }, data: data as any }) as Promise<IOAuthClient>;
  }

  // ── Connections ──────────────────────────────────────────────────

  async createConnection(data: Partial<IOAuthConnection>): Promise<IOAuthConnection> {
    return this.prisma.oAuthConnection.create({ data: data as any }) as Promise<IOAuthConnection>;
  }

  async findConnectionById(id: string): Promise<IOAuthConnection | null> {
    return this.prisma.oAuthConnection.findFirst({ where: { id } }) as Promise<IOAuthConnection | null>;
  }

  /**
   * Dedup/reconnect lookup for "same scope, provider, account" — regardless of status, so the
   * service can distinguish "already connected" (throw) from "previously revoked/disconnected/expired"
   * (reconnect in place instead of accumulating duplicate rows). `externalAccountId: null` is matched
   * explicitly for pre-consent/client-credentials connections.
   */
  async findConnectionByIdentity(clientId: string, scopeKey: string, externalAccountId: string | null): Promise<IOAuthConnection | null> {
    return this.prisma.oAuthConnection.findFirst({
      where: { clientId, scopeKey, externalAccountId },
    }) as Promise<IOAuthConnection | null>;
  }

  async findAllConnections(workspaceId: string, filter: OAuthConnectionFilterDto): Promise<[IOAuthConnection[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.status) where.status = filter.status;
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.clientId) where.clientId = filter.clientId;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.oAuthConnection.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.oAuthConnection.count({ where: where as any }),
    ]);

    return [data as IOAuthConnection[], total];
  }

  async updateConnection(id: string, data: Partial<IOAuthConnection>): Promise<IOAuthConnection> {
    return this.prisma.oAuthConnection.update({ where: { id }, data: data as any }) as Promise<IOAuthConnection>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async findConnectionsDueForRefresh(before: Date): Promise<IOAuthConnection[]> {
    return this.prisma.oAuthConnection.findMany({
      where: {
        status: OAuthConnectionStatus.CONNECTED as any,
        accessTokenExpiresAt: { lte: before },
        encryptedRefreshToken: { not: null },
      },
    }) as Promise<IOAuthConnection[]>;
  }

  async findExpiredWithoutRefreshToken(before: Date): Promise<IOAuthConnection[]> {
    return this.prisma.oAuthConnection.findMany({
      where: {
        status: OAuthConnectionStatus.CONNECTED as any,
        accessTokenExpiresAt: { lte: before },
        encryptedRefreshToken: null,
      },
    }) as Promise<IOAuthConnection[]>;
  }

  // ── Authorization requests ───────────────────────────────────────

  async createAuthorizationRequest(data: Partial<IOAuthAuthorizationRequest>): Promise<IOAuthAuthorizationRequest> {
    return this.prisma.oAuthAuthorizationRequest.create({ data: data as any }) as Promise<IOAuthAuthorizationRequest>;
  }

  async findAuthorizationRequestByState(state: string): Promise<IOAuthAuthorizationRequest | null> {
    return this.prisma.oAuthAuthorizationRequest.findFirst({ where: { state } }) as Promise<IOAuthAuthorizationRequest | null>;
  }

  async updateAuthorizationRequest(id: string, data: Partial<IOAuthAuthorizationRequest>): Promise<IOAuthAuthorizationRequest> {
    return this.prisma.oAuthAuthorizationRequest.update({ where: { id }, data: data as any }) as Promise<IOAuthAuthorizationRequest>;
  }

  async findExpiredPendingRequests(before: Date): Promise<IOAuthAuthorizationRequest[]> {
    return this.prisma.oAuthAuthorizationRequest.findMany({
      where: { status: OAuthAuthorizationRequestStatus.PENDING as any, expiresAt: { lte: before } },
    }) as Promise<IOAuthAuthorizationRequest[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IOAuthHistory>): Promise<IOAuthHistory> {
    return this.prisma.oAuthHistory.create({ data: data as any }) as Promise<IOAuthHistory>;
  }

  async findHistory(entityId: string): Promise<IOAuthHistory[]> {
    return this.prisma.oAuthHistory.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }) as Promise<IOAuthHistory[]>;
  }
}
