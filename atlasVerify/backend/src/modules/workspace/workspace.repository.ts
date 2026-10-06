import { Injectable } from '@nestjs/common';
import { Prisma, Workspace, WorkspaceMemberStatus, WorkspaceInvitationStatus } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IWorkspace, IWorkspaceMember, IWorkspaceInvitation } from './interfaces';
import type { MemberFilterDto, InvitationFilterDto } from './dto';

/**
 * WorkspaceRepository
 *
 * Rule: Data access only. No business logic.
 *       Accesses workspaces table and user-workspace membership.
 */
@Injectable()
export class WorkspaceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findById(id: string): Promise<IWorkspace | null> {
    return this.prisma.workspace.findFirst({
      where: { id, deletedAt: null },
    }) as unknown as Promise<IWorkspace | null>;
  }

  async findBySlug(slug: string): Promise<IWorkspace | null> {
    return this.prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    }) as unknown as Promise<IWorkspace | null>;
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.workspace.count({ where: { slug } });
    return count > 0;
  }

  async findAllForUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[IWorkspace[], number]> {
    const where = {
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { users: { some: { id: userId, deletedAt: null } } },
      ],
    } as Prisma.WorkspaceWhereInput;

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return [workspaces as unknown as IWorkspace[], total];
  }

  /** Platform-wide, cross-tenant listing — deliberately UNSCOPED by membership, unlike `findAllForUser`. Callers must gate access to this themselves (e.g. `PlatformAdminGuard`); this is a pure read, no business logic. */
  async findAllPlatformWide(
    filter: { status?: string; search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' },
    skip: number,
    take: number,
  ): Promise<[IWorkspace[], number]> {
    const where: Prisma.WorkspaceWhereInput = { deletedAt: null };
    if (filter.status) where.status = filter.status as any;
    if (filter.search) {
      where.OR = [{ name: { contains: filter.search, mode: 'insensitive' } }, { slug: { contains: filter.search, mode: 'insensitive' } }];
    }

    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({ where, skip, take, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.workspace.count({ where }),
    ]);

    return [workspaces as unknown as IWorkspace[], total];
  }

  /** All workspace IDs belonging to one organization scope — used by SaaS Audit's organization-scoped cross-tenant search, since no `Organization` table/join exists yet (see the `organizationId` column's own doc comment). */
  async findIdsByOrganization(organizationId: string): Promise<string[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    return workspaces.map((w) => w.id);
  }

  async create(data: Prisma.WorkspaceUncheckedCreateInput): Promise<IWorkspace> {
    return this.prisma.workspace.create({ data }) as unknown as Promise<IWorkspace>;
  }

  async update(id: string, data: Record<string, unknown>): Promise<IWorkspace> {
    return this.prisma.workspace.update({
      where: { id },
      data: data as Prisma.WorkspaceUncheckedUpdateInput,
    }) as unknown as Promise<IWorkspace>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.workspace.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Returns the user's role in a workspace, or null if they are not a member.
   * Used for permission checks without loading the full workspace.
   */
  async findUserInWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<{ role: string } | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, workspaceId, deletedAt: null },
      select: { role: true },
    });
  }

  // ── Members ──────────────────────────────────────────────────

  async createMember(data: Partial<IWorkspaceMember>): Promise<IWorkspaceMember> {
    return this.prisma.workspaceMember.create({ data: data as any }) as unknown as Promise<IWorkspaceMember>;
  }

  async findMemberById(id: string): Promise<IWorkspaceMember | null> {
    return this.prisma.workspaceMember.findFirst({ where: { id } }) as unknown as Promise<IWorkspaceMember | null>;
  }

  async findMember(workspaceId: string, userId: string): Promise<IWorkspaceMember | null> {
    return this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    }) as unknown as Promise<IWorkspaceMember | null>;
  }

  async findMembers(workspaceId: string, filter: MemberFilterDto): Promise<[IWorkspaceMember[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.role) where.role = filter.role;
    if (filter.status) where.status = filter.status;
    else where.status = { not: WorkspaceMemberStatus.REMOVED };

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.workspaceMember.findMany({ where: where as any, skip, take: limit, orderBy: { joinedAt: 'desc' } }),
      this.prisma.workspaceMember.count({ where: where as any }),
    ]);

    return [items as unknown as IWorkspaceMember[], total];
  }

  async updateMember(id: string, data: Partial<IWorkspaceMember>): Promise<IWorkspaceMember> {
    return this.prisma.workspaceMember.update({ where: { id }, data: data as any }) as unknown as Promise<IWorkspaceMember>;
  }

  // ── Invitations ──────────────────────────────────────────────

  async createInvitation(data: Partial<IWorkspaceInvitation>): Promise<IWorkspaceInvitation> {
    return this.prisma.workspaceInvitation.create({ data: data as any }) as unknown as Promise<IWorkspaceInvitation>;
  }

  async findInvitationById(id: string): Promise<IWorkspaceInvitation | null> {
    return this.prisma.workspaceInvitation.findFirst({ where: { id } }) as unknown as Promise<IWorkspaceInvitation | null>;
  }

  async findInvitationByToken(token: string): Promise<IWorkspaceInvitation | null> {
    return this.prisma.workspaceInvitation.findFirst({ where: { token } }) as unknown as Promise<IWorkspaceInvitation | null>;
  }

  async findPendingInvitationByEmail(workspaceId: string, email: string): Promise<IWorkspaceInvitation | null> {
    return this.prisma.workspaceInvitation.findFirst({
      where: { workspaceId, email, status: WorkspaceInvitationStatus.PENDING },
    }) as unknown as Promise<IWorkspaceInvitation | null>;
  }

  async findInvitations(workspaceId: string, filter: InvitationFilterDto): Promise<[IWorkspaceInvitation[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.workspaceInvitation.findMany({ where: where as any, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.workspaceInvitation.count({ where: where as any }),
    ]);

    return [items as unknown as IWorkspaceInvitation[], total];
  }

  async updateInvitation(id: string, data: Partial<IWorkspaceInvitation>): Promise<IWorkspaceInvitation> {
    return this.prisma.workspaceInvitation.update({ where: { id }, data: data as any }) as unknown as Promise<IWorkspaceInvitation>;
  }
}

