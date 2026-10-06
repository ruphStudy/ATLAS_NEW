import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ITag, ITagGroup, ITagAssignment, ITagHistory, ITagSavedView } from './interfaces';
import { TagFilterDto } from './dto';

@Injectable()
export class TagsManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Tags ─────────────────────────────────────────────────────────

  async create(data: Partial<ITag>): Promise<ITag> {
    return this.prisma.tag.create({ data: data as any }) as Promise<ITag>;
  }

  async findById(id: string): Promise<ITag | null> {
    return this.prisma.tag.findFirst({ where: { id, deletedAt: null } }) as Promise<ITag | null>;
  }

  async findByIds(ids: string[]): Promise<ITag[]> {
    return this.prisma.tag.findMany({ where: { id: { in: ids }, deletedAt: null } }) as Promise<ITag[]>;
  }

  async findByScopeKeyAndSlug(scopeKey: string, slug: string): Promise<ITag | null> {
    return this.prisma.tag.findFirst({
      where: { scopeKey, slug, deletedAt: null },
    }) as Promise<ITag | null>;
  }

  async findAll(visibleScopeKeys: string[], filter: TagFilterDto): Promise<[ITag[], number]> {
    const where: Record<string, unknown> = { scopeKey: { in: visibleScopeKeys }, deletedAt: null };
    if (filter.scope) where.scope = filter.scope;
    if (filter.module) where.module = filter.module;
    if (filter.groupId) where.groupId = filter.groupId;
    if (filter.category) where.category = filter.category;
    if (filter.status) where.status = filter.status;
    if (filter.managedBy) where.managedBy = filter.managedBy;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'displayOrder';
    const sortOrder = filter.sortOrder ?? 'asc';

    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.tag.count({ where: where as any }),
    ]);

    return [data as ITag[], total];
  }

  async update(id: string, data: Partial<ITag>): Promise<ITag> {
    return this.prisma.tag.update({ where: { id }, data: data as any }) as Promise<ITag>;
  }

  async incrementUsageCount(id: string, delta: number): Promise<void> {
    await this.prisma.tag.update({ where: { id }, data: { usageCount: { increment: delta } } });
  }

  async createHistory(data: Partial<ITagHistory>): Promise<ITagHistory> {
    return this.prisma.tagHistory.create({ data: data as any }) as Promise<ITagHistory>;
  }

  async findHistory(tagId: string): Promise<ITagHistory[]> {
    return this.prisma.tagHistory.findMany({
      where: { tagId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITagHistory[]>;
  }

  // ── Tag groups ───────────────────────────────────────────────────

  async createGroup(data: Partial<ITagGroup>): Promise<ITagGroup> {
    return this.prisma.tagGroup.create({ data: data as any }) as Promise<ITagGroup>;
  }

  async findGroupById(id: string): Promise<ITagGroup | null> {
    return this.prisma.tagGroup.findFirst({ where: { id, deletedAt: null } }) as Promise<ITagGroup | null>;
  }

  async findGroupByScopeKeyAndName(scopeKey: string, name: string): Promise<ITagGroup | null> {
    return this.prisma.tagGroup.findFirst({
      where: { scopeKey, name, deletedAt: null },
    }) as Promise<ITagGroup | null>;
  }

  async listGroups(scopeKey: string): Promise<ITagGroup[]> {
    return this.prisma.tagGroup.findMany({
      where: { scopeKey, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    }) as Promise<ITagGroup[]>;
  }

  async updateGroup(id: string, data: Partial<ITagGroup>): Promise<ITagGroup> {
    return this.prisma.tagGroup.update({ where: { id }, data: data as any }) as Promise<ITagGroup>;
  }

  async softDeleteGroup(id: string): Promise<void> {
    await this.prisma.tagGroup.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async countTagsInGroup(groupId: string): Promise<number> {
    return this.prisma.tag.count({ where: { groupId, deletedAt: null } });
  }

  // ── Assignments ──────────────────────────────────────────────────

  async createAssignment(data: Partial<ITagAssignment>): Promise<ITagAssignment> {
    return this.prisma.tagAssignment.create({ data: data as any }) as Promise<ITagAssignment>;
  }

  async findAssignment(tagId: string, entityType: string, entityId: string): Promise<ITagAssignment | null> {
    return this.prisma.tagAssignment.findUnique({
      where: { tagId_entityType_entityId: { tagId, entityType, entityId } },
    }) as Promise<ITagAssignment | null>;
  }

  async findAssignmentById(id: string): Promise<ITagAssignment | null> {
    return this.prisma.tagAssignment.findUnique({ where: { id } }) as Promise<ITagAssignment | null>;
  }

  async listAssignmentsForEntity(workspaceId: string, entityType: string, entityId: string): Promise<ITagAssignment[]> {
    return this.prisma.tagAssignment.findMany({
      where: { workspaceId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITagAssignment[]>;
  }

  async listAssignmentsForTag(tagId: string): Promise<ITagAssignment[]> {
    return this.prisma.tagAssignment.findMany({ where: { tagId } }) as Promise<ITagAssignment[]>;
  }

  async deleteAssignment(id: string): Promise<void> {
    await this.prisma.tagAssignment.delete({ where: { id } });
  }

  // ── Saved views ──────────────────────────────────────────────────

  async createSavedView(data: Partial<ITagSavedView>): Promise<ITagSavedView> {
    return this.prisma.tagSavedView.create({ data: data as any }) as Promise<ITagSavedView>;
  }

  async findSavedViewById(id: string): Promise<ITagSavedView | null> {
    return this.prisma.tagSavedView.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<ITagSavedView | null>;
  }

  async listSavedViews(workspaceId: string, userId: string): Promise<ITagSavedView[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      OR: [{ userId }, { isShared: true }],
    };
    return this.prisma.tagSavedView.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ITagSavedView[]>;
  }

  async updateSavedView(id: string, data: Partial<ITagSavedView>): Promise<ITagSavedView> {
    return this.prisma.tagSavedView.update({ where: { id }, data: data as any }) as Promise<ITagSavedView>;
  }

  async deleteSavedView(id: string): Promise<void> {
    await this.prisma.tagSavedView.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
