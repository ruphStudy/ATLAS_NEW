import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TagsManagementService } from './tags-management.service';
import {
  CreateTagDto,
  UpdateTagDto,
  TagFilterDto,
  CreateTagGroupDto,
  UpdateTagGroupDto,
  AssignTagDto,
  BulkAssignTagsDto,
  BulkRemoveTagsDto,
  EntityTagsQueryDto,
  CreateSavedViewDto,
  UpdateSavedViewDto,
  TagResponseDto,
  PaginatedTagResponseDto,
  TagGroupResponseDto,
  TagAssignmentResponseDto,
  TagHistoryResponseDto,
  TagSavedViewResponseDto,
} from './dto';

@Controller({ path: 'tags-management', version: '1' })
export class TagsManagementController {
  constructor(private readonly tagsManagementService: TagsManagementService) {}

  // ── Tags ─────────────────────────────────────────────────────────

  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async createTag(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateTagDto,
  ): Promise<TagResponseDto> {
    return (await this.tagsManagementService.createTag(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as TagResponseDto;
  }

  @Get('tags')
  async findAllTags(
    @WorkspaceId() workspaceId: string,
    @Query() filter: TagFilterDto,
  ): Promise<PaginatedTagResponseDto> {
    return this.tagsManagementService.findAllTags(workspaceId, filter);
  }

  @Get('tags/entity')
  async listTagsForEntity(
    @WorkspaceId() workspaceId: string,
    @Query() query: EntityTagsQueryDto,
  ): Promise<TagResponseDto[]> {
    return (await this.tagsManagementService.listTagsForEntity(
      workspaceId,
      query.entityType,
      query.entityId,
    )) as unknown as TagResponseDto[];
  }

  @Post('tags/bulk-assign')
  async bulkAssign(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BulkAssignTagsDto,
  ): Promise<TagAssignmentResponseDto[]> {
    return (await this.tagsManagementService.bulkAssign(
      workspaceId,
      userId,
      dto,
    )) as unknown as TagAssignmentResponseDto[];
  }

  @Post('tags/bulk-remove')
  async bulkRemove(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BulkRemoveTagsDto,
  ): Promise<{ removed: number }> {
    const removed = await this.tagsManagementService.bulkRemove(workspaceId, userId, dto);
    return { removed };
  }

  // ── Groups (static routes before `tags/:id`) ────────────────────

  @Post('groups')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateTagGroupDto,
  ): Promise<TagGroupResponseDto> {
    return (await this.tagsManagementService.createGroup(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as TagGroupResponseDto;
  }

  @Get('groups')
  async listGroups(@WorkspaceId() workspaceId: string): Promise<TagGroupResponseDto[]> {
    return (await this.tagsManagementService.listGroups(workspaceId)) as unknown as TagGroupResponseDto[];
  }

  @Patch('groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateTagGroupDto,
  ): Promise<TagGroupResponseDto> {
    return (await this.tagsManagementService.updateGroup(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as TagGroupResponseDto;
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroup(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<void> {
    await this.tagsManagementService.removeGroup(id, workspaceId, userId, userRole);
  }

  // ── Saved views ──────────────────────────────────────────────────

  @Post('saved-views')
  @HttpCode(HttpStatus.CREATED)
  async createSavedView(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateSavedViewDto,
  ): Promise<TagSavedViewResponseDto> {
    return (await this.tagsManagementService.createSavedView(
      workspaceId,
      userId,
      dto,
    )) as unknown as TagSavedViewResponseDto;
  }

  @Get('saved-views')
  async listSavedViews(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<TagSavedViewResponseDto[]> {
    return (await this.tagsManagementService.listSavedViews(
      workspaceId,
      userId,
    )) as unknown as TagSavedViewResponseDto[];
  }

  @Patch('saved-views/:id')
  async updateSavedView(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateSavedViewDto,
  ): Promise<TagSavedViewResponseDto> {
    return (await this.tagsManagementService.updateSavedView(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as TagSavedViewResponseDto;
  }

  @Delete('saved-views/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedView(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.tagsManagementService.deleteSavedView(id, workspaceId, userId);
  }

  // ── Single tag ───────────────────────────────────────────────────

  @Get('tags/:id')
  async findTag(@Param('id') id: string): Promise<TagResponseDto> {
    return (await this.tagsManagementService.findTag(id)) as unknown as TagResponseDto;
  }

  @Patch('tags/:id')
  async updateTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return (await this.tagsManagementService.updateTag(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as TagResponseDto;
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<void> {
    await this.tagsManagementService.deleteTag(id, workspaceId, userId, userRole);
  }

  @Post('tags/:id/archive')
  async archiveTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<TagResponseDto> {
    return (await this.tagsManagementService.archiveTag(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as TagResponseDto;
  }

  @Post('tags/:id/restore')
  async restoreTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<TagResponseDto> {
    return (await this.tagsManagementService.restoreTag(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as TagResponseDto;
  }

  @Get('tags/:id/history')
  async getTagHistory(@Param('id') id: string): Promise<TagHistoryResponseDto[]> {
    return (await this.tagsManagementService.getTagHistory(id)) as unknown as TagHistoryResponseDto[];
  }

  @Post('tags/:id/assign')
  @HttpCode(HttpStatus.CREATED)
  async assignTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AssignTagDto,
  ): Promise<TagAssignmentResponseDto> {
    return (await this.tagsManagementService.assignTag(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as TagAssignmentResponseDto;
  }

  @Delete('tags/:id/assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignTag(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() query: EntityTagsQueryDto,
  ): Promise<void> {
    await this.tagsManagementService.unassignTag(id, query.entityType, query.entityId, workspaceId, userId);
  }
}
