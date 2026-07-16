import { Injectable } from '@nestjs/common';
import { Prisma, Workspace } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IWorkspace } from './interfaces';

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
}

