import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { RecordActivityDto } from '@modules/activity-center/dto';
import { ActivityActorType, ActivityOutcome } from '@modules/activity-center/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { AuditActionCategory } from '@modules/audit-logs/interfaces';
import { TagsManagementRepository } from './tags-management.repository';
import { TagsManagementEventQueue } from './jobs';
import { buildTagScopeKey, slugifyTagName } from './scope-key.util';
import {
  CreateTagDto,
  UpdateTagDto,
  TagFilterDto,
  CreateTagGroupDto,
  UpdateTagGroupDto,
  AssignTagDto,
  BulkAssignTagsDto,
  BulkRemoveTagsDto,
  CreateSavedViewDto,
  UpdateSavedViewDto,
  PaginatedTagResponseDto,
} from './dto';
import {
  ITag,
  ITagGroup,
  ITagAssignment,
  ITagHistory,
  ITagSavedView,
  TagScope,
  TagStatus,
  TagManagedBy,
  TagsManagementEvent,
} from './interfaces';
import { TAGS_MANAGEMENT_MODULE, TAGS_GLOBAL_SCOPE_ROLES, TAGS_WORKSPACE_SCOPE_ROLES } from './constants';
import {
  TagNotFoundException,
  TagAlreadyExistsException,
  TagIsSystemTagException,
  TagInvalidStateTransitionException,
  TagAccessDeniedException,
  TagGroupNotFoundException,
  TagGroupAlreadyExistsException,
  TagAssignmentAlreadyExistsException,
  TagAssignmentNotFoundException,
  TagSavedViewNotFoundException,
} from './exceptions/tags-management.exceptions';

@Injectable()
export class TagsManagementService {
  private readonly logger = new Logger(TagsManagementService.name);

  constructor(
    private readonly repository: TagsManagementRepository,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: TagsManagementEventQueue,
  ) {}

  // ── Tags ─────────────────────────────────────────────────────────

  async createTag(workspaceId: string, userId: string, userRole: string, dto: CreateTagDto): Promise<ITag> {
    const scope = dto.scope ?? TagScope.WORKSPACE;
    const managedBy = dto.managedBy ?? TagManagedBy.USER;

    if (scope === TagScope.GLOBAL || scope === TagScope.ORGANIZATION || managedBy === TagManagedBy.SYSTEM) {
      this.assertGlobalScopeRole(userRole);
    }

    const scopeWorkspaceId = scope === TagScope.GLOBAL || scope === TagScope.ORGANIZATION ? undefined : workspaceId;
    const scopeKey = buildTagScopeKey({
      scope,
      workspaceId: scopeWorkspaceId,
      organizationId: dto.organizationId,
      module: dto.module,
    });
    const slug = slugifyTagName(dto.name);

    const existing = await this.repository.findByScopeKeyAndSlug(scopeKey, slug);
    if (existing) {
      throw new TagAlreadyExistsException(dto.name);
    }

    if (dto.groupId) {
      await this.getGroupOrThrow(dto.groupId);
    }

    const tag = await this.repository.create({
      workspaceId: scopeWorkspaceId ?? null,
      organizationId: scope === TagScope.ORGANIZATION ? dto.organizationId : null,
      scopeKey,
      scope,
      module: dto.module,
      name: dto.name,
      slug,
      description: dto.description,
      groupId: dto.groupId,
      category: dto.category,
      icon: dto.icon,
      color: dto.color,
      displayOrder: dto.displayOrder ?? 0,
      managedBy,
      isSystem: managedBy === TagManagedBy.SYSTEM,
      status: TagStatus.ACTIVE,
      usageCount: 0,
      createdBy: userId,
    });

    await this.repository.createHistory({
      tagId: tag.id,
      workspaceId: tag.workspaceId,
      toStatus: TagStatus.ACTIVE,
      reason: 'Created',
      changedBy: userId,
    });

    await this.recordAudit(workspaceId, userId, 'tags-management.tag.created', AuditActionCategory.CREATE, tag.id);
    await this.publishEvent(TagsManagementEvent.TAG_CREATED, { workspaceId, tagId: tag.id, actorId: userId });
    return tag;
  }

  async updateTag(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateTagDto): Promise<ITag> {
    const tag = await this.getTagOrThrow(id);
    await this.assertCanManageTag(tag, userId, workspaceId, userRole);

    let slug: string | undefined;
    if (dto.name && dto.name !== tag.name) {
      slug = slugifyTagName(dto.name);
      const existing = await this.repository.findByScopeKeyAndSlug(tag.scopeKey, slug);
      if (existing && existing.id !== id) {
        throw new TagAlreadyExistsException(dto.name);
      }
    }

    if (dto.groupId) {
      await this.getGroupOrThrow(dto.groupId);
    }

    const updated = await this.repository.update(id, {
      name: dto.name,
      slug,
      description: dto.description,
      groupId: dto.groupId,
      category: dto.category,
      icon: dto.icon,
      color: dto.color,
      displayOrder: dto.displayOrder,
    } as Partial<ITag>);

    await this.recordAudit(workspaceId, userId, 'tags-management.tag.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(TagsManagementEvent.TAG_UPDATED, { workspaceId, tagId: id, actorId: userId });
    return updated;
  }

  async archiveTag(id: string, workspaceId: string, userId: string, userRole: string): Promise<ITag> {
    const tag = await this.getTagOrThrow(id);
    await this.assertCanManageTag(tag, userId, workspaceId, userRole);
    if (tag.status === TagStatus.ARCHIVED) {
      throw new TagInvalidStateTransitionException(tag.status, 'archive');
    }

    const updated = await this.repository.update(id, {
      status: TagStatus.ARCHIVED,
      archivedAt: new Date(),
    } as Partial<ITag>);

    await this.repository.createHistory({
      tagId: id,
      workspaceId: tag.workspaceId,
      fromStatus: tag.status,
      toStatus: TagStatus.ARCHIVED,
      reason: 'Archived',
      changedBy: userId,
    });
    await this.recordAudit(workspaceId, userId, 'tags-management.tag.archived', AuditActionCategory.DELETE, id);
    await this.publishEvent(TagsManagementEvent.TAG_ARCHIVED, { workspaceId, tagId: id, actorId: userId });
    return updated;
  }

  async restoreTag(id: string, workspaceId: string, userId: string, userRole: string): Promise<ITag> {
    const tag = await this.getTagOrThrow(id);
    await this.assertCanManageTag(tag, userId, workspaceId, userRole);
    if (tag.status !== TagStatus.ARCHIVED) {
      throw new TagInvalidStateTransitionException(tag.status, 'restore');
    }

    const updated = await this.repository.update(id, {
      status: TagStatus.ACTIVE,
      archivedAt: null,
    } as Partial<ITag>);

    await this.repository.createHistory({
      tagId: id,
      workspaceId: tag.workspaceId,
      fromStatus: tag.status,
      toStatus: TagStatus.ACTIVE,
      reason: 'Restored',
      changedBy: userId,
    });
    await this.recordAudit(workspaceId, userId, 'tags-management.tag.restored', AuditActionCategory.RESTORE, id);
    await this.publishEvent(TagsManagementEvent.TAG_RESTORED, { workspaceId, tagId: id, actorId: userId });
    return updated;
  }

  async deleteTag(id: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    const tag = await this.getTagOrThrow(id);
    if (tag.isSystem) {
      throw new TagIsSystemTagException(tag.name);
    }
    await this.assertCanManageTag(tag, userId, workspaceId, userRole);

    await this.repository.update(id, { deletedAt: new Date() } as Partial<ITag>);
    await this.recordAudit(workspaceId, userId, 'tags-management.tag.deleted', AuditActionCategory.DELETE, id);
    await this.publishEvent(TagsManagementEvent.TAG_DELETED, { workspaceId, tagId: id, actorId: userId });
  }

  async findTag(id: string): Promise<ITag> {
    return this.getTagOrThrow(id);
  }

  async findAllTags(workspaceId: string, filter: TagFilterDto): Promise<PaginatedTagResponseDto> {
    const visibleScopeKeys = ['GLOBAL', `WORKSPACE:${workspaceId}`];
    if (filter.module) {
      visibleScopeKeys.push(`MODULE:${workspaceId}:${filter.module}`);
    }

    const [data, total] = await this.repository.findAll(visibleScopeKeys, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTagHistory(id: string): Promise<ITagHistory[]> {
    await this.getTagOrThrow(id);
    return this.repository.findHistory(id);
  }

  // ── Tag groups ───────────────────────────────────────────────────

  async createGroup(workspaceId: string, userId: string, userRole: string, dto: CreateTagGroupDto): Promise<ITagGroup> {
    this.assertWorkspaceScopeRole(userRole);
    const scopeKey = `WORKSPACE:${workspaceId}`;

    const existing = await this.repository.findGroupByScopeKeyAndName(scopeKey, dto.name);
    if (existing) {
      throw new TagGroupAlreadyExistsException(dto.name);
    }

    const group = await this.repository.createGroup({
      workspaceId,
      scopeKey,
      name: dto.name,
      description: dto.description,
      displayOrder: dto.displayOrder ?? 0,
    });

    await this.publishEvent(TagsManagementEvent.TAG_GROUP_CREATED, { workspaceId, groupId: group.id, actorId: userId });
    return group;
  }

  async updateGroup(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateTagGroupDto): Promise<ITagGroup> {
    this.assertWorkspaceScopeRole(userRole);
    const group = await this.getGroupOrThrow(id);

    if (dto.name && dto.name !== group.name) {
      const existing = await this.repository.findGroupByScopeKeyAndName(group.scopeKey, dto.name);
      if (existing && existing.id !== id) {
        throw new TagGroupAlreadyExistsException(dto.name);
      }
    }

    const updated = await this.repository.updateGroup(id, {
      name: dto.name,
      description: dto.description,
      displayOrder: dto.displayOrder,
    } as Partial<ITagGroup>);

    await this.publishEvent(TagsManagementEvent.TAG_GROUP_UPDATED, { workspaceId, groupId: id, actorId: userId });
    return updated;
  }

  async listGroups(workspaceId: string): Promise<ITagGroup[]> {
    return this.repository.listGroups(`WORKSPACE:${workspaceId}`);
  }

  async removeGroup(id: string, workspaceId: string, userId: string, userRole: string): Promise<void> {
    this.assertWorkspaceScopeRole(userRole);
    await this.getGroupOrThrow(id);

    const tagCount = await this.repository.countTagsInGroup(id);
    if (tagCount > 0) {
      throw new TagInvalidStateTransitionException('IN_USE', 'delete');
    }

    await this.repository.softDeleteGroup(id);
    await this.publishEvent(TagsManagementEvent.TAG_GROUP_DELETED, { workspaceId, groupId: id, actorId: userId });
  }

  // ── Assignment ───────────────────────────────────────────────────

  async assignTag(tagId: string, workspaceId: string, userId: string, dto: AssignTagDto): Promise<ITagAssignment> {
    const tag = await this.getAssignableTagOrThrow(tagId, workspaceId);

    const existing = await this.repository.findAssignment(tagId, dto.entityType, dto.entityId);
    if (existing) {
      throw new TagAssignmentAlreadyExistsException();
    }

    const assignment = await this.repository.createAssignment({
      tagId,
      workspaceId,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      assignedBy: userId,
    });
    await this.repository.incrementUsageCount(tagId, 1);

    await this.recordActivity(workspaceId, userId, 'tags-management.tag_assigned', tag, dto.entityType, dto.entityId);
    await this.publishEvent(TagsManagementEvent.TAG_ASSIGNED, {
      workspaceId,
      tagId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      actorId: userId,
    });
    return assignment;
  }

  async unassignTag(tagId: string, entityType: string, entityId: string, workspaceId: string, userId: string): Promise<void> {
    await this.getTagOrThrow(tagId);
    const assignment = await this.repository.findAssignment(tagId, entityType, entityId);
    if (!assignment) {
      throw new TagAssignmentNotFoundException(`${tagId}:${entityType}:${entityId}`);
    }

    await this.repository.deleteAssignment(assignment.id);
    await this.repository.incrementUsageCount(tagId, -1);
    await this.publishEvent(TagsManagementEvent.TAG_UNASSIGNED, { workspaceId, tagId, entityType, entityId, actorId: userId });
  }

  async bulkAssign(workspaceId: string, userId: string, dto: BulkAssignTagsDto): Promise<ITagAssignment[]> {
    const results: ITagAssignment[] = [];
    for (const tagId of dto.tagIds) {
      await this.getAssignableTagOrThrow(tagId, workspaceId);
      const existing = await this.repository.findAssignment(tagId, dto.entityType, dto.entityId);
      if (existing) {
        continue;
      }
      const assignment = await this.repository.createAssignment({
        tagId,
        workspaceId,
        module: dto.module,
        entityType: dto.entityType,
        entityId: dto.entityId,
        assignedBy: userId,
      });
      await this.repository.incrementUsageCount(tagId, 1);
      results.push(assignment);
    }

    await this.publishEvent(TagsManagementEvent.TAGS_BULK_ASSIGNED, {
      workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      actorId: userId,
      metadata: { count: results.length },
    });
    return results;
  }

  async bulkRemove(workspaceId: string, userId: string, dto: BulkRemoveTagsDto): Promise<number> {
    let removed = 0;
    for (const tagId of dto.tagIds) {
      const existing = await this.repository.findAssignment(tagId, dto.entityType, dto.entityId);
      if (!existing) {
        continue;
      }
      await this.repository.deleteAssignment(existing.id);
      await this.repository.incrementUsageCount(tagId, -1);
      removed += 1;
    }

    await this.publishEvent(TagsManagementEvent.TAGS_BULK_UNASSIGNED, {
      workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      actorId: userId,
      metadata: { count: removed },
    });
    return removed;
  }

  async listTagsForEntity(workspaceId: string, entityType: string, entityId: string): Promise<ITag[]> {
    const assignments = await this.repository.listAssignmentsForEntity(workspaceId, entityType, entityId);
    if (assignments.length === 0) {
      return [];
    }
    return this.repository.findByIds(assignments.map((a) => a.tagId));
  }

  // ── Saved views ──────────────────────────────────────────────────

  async createSavedView(workspaceId: string, userId: string, dto: CreateSavedViewDto): Promise<ITagSavedView> {
    return this.repository.createSavedView({
      workspaceId,
      userId,
      name: dto.name,
      filters: dto.filters,
      isShared: dto.isShared ?? false,
    });
  }

  async listSavedViews(workspaceId: string, userId: string): Promise<ITagSavedView[]> {
    return this.repository.listSavedViews(workspaceId, userId);
  }

  async updateSavedView(id: string, workspaceId: string, userId: string, dto: UpdateSavedViewDto): Promise<ITagSavedView> {
    const view = await this.getSavedViewOrThrow(id, workspaceId);
    if (view.userId !== userId) {
      throw new TagAccessDeniedException();
    }

    return this.repository.updateSavedView(id, {
      name: dto.name,
      filters: dto.filters,
      isShared: dto.isShared,
    } as Partial<ITagSavedView>);
  }

  async deleteSavedView(id: string, workspaceId: string, userId: string): Promise<void> {
    const view = await this.getSavedViewOrThrow(id, workspaceId);
    if (view.userId !== userId) {
      throw new TagAccessDeniedException();
    }
    await this.repository.deleteSavedView(id);
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getTagOrThrow(id: string): Promise<ITag> {
    const tag = await this.repository.findById(id);
    if (!tag) {
      throw new TagNotFoundException(id);
    }
    return tag;
  }

  /** A tag must be ACTIVE and visible to this workspace (GLOBAL, or belonging to this workspace) to be assignable. */
  private async getAssignableTagOrThrow(id: string, workspaceId: string): Promise<ITag> {
    const tag = await this.getTagOrThrow(id);
    if (tag.workspaceId && tag.workspaceId !== workspaceId) {
      throw new TagNotFoundException(id);
    }
    if (tag.status !== TagStatus.ACTIVE) {
      throw new TagInvalidStateTransitionException(tag.status, 'assign');
    }
    return tag;
  }

  private async getGroupOrThrow(id: string): Promise<ITagGroup> {
    const group = await this.repository.findGroupById(id);
    if (!group) {
      throw new TagGroupNotFoundException(id);
    }
    return group;
  }

  private async getSavedViewOrThrow(id: string, workspaceId: string): Promise<ITagSavedView> {
    const view = await this.repository.findSavedViewById(id);
    if (!view || view.workspaceId !== workspaceId) {
      throw new TagSavedViewNotFoundException(id);
    }
    return view;
  }

  private assertGlobalScopeRole(userRole: string): void {
    if (!TAGS_GLOBAL_SCOPE_ROLES.includes(userRole)) {
      throw new TagAccessDeniedException();
    }
  }

  private assertWorkspaceScopeRole(userRole: string): void {
    if (!TAGS_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
      throw new TagAccessDeniedException();
    }
  }

  private async assertCanManageTag(tag: ITag, userId: string, workspaceId: string, userRole: string): Promise<void> {
    if (tag.isSystem) {
      if (TAGS_GLOBAL_SCOPE_ROLES.includes(userRole)) {
        return;
      }
      const hasAdminRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'admin');
      if (!hasAdminRole) {
        throw new TagAccessDeniedException();
      }
      return;
    }

    if (tag.createdBy === userId) {
      return;
    }
    if (TAGS_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
      return;
    }
    const hasAdminRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'admin');
    if (!hasAdminRole) {
      throw new TagAccessDeniedException();
    }
  }

  private async recordActivity(
    workspaceId: string,
    actorId: string,
    action: string,
    tag: ITag,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    try {
      const dto: RecordActivityDto = {
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId,
        action,
        sourceModule: TAGS_MANAGEMENT_MODULE,
        entityType,
        entityId,
        outcome: ActivityOutcome.SUCCESS,
        title: `Tagged with "${tag.name}"`,
        timelineId: `tags:${entityType}:${entityId}`,
      } as RecordActivityDto;
      await this.activityCenterService.record(dto);
    } catch (error) {
      this.logger.warn(`Failed to record activity for tag ${tag.id}: ${(error as Error).message}`);
    }
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: TAGS_MANAGEMENT_MODULE,
      entityType: 'Tag',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: TagsManagementEvent,
    opts: {
      workspaceId?: string;
      tagId?: string;
      groupId?: string;
      entityType?: string;
      entityId?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
