import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SettingDefinitionFilterDto } from '@modules/settings/dto';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferencesCategory } from './constants';
import {
  UpdateDisplayPreferencesDto,
  UpdateNotificationPreferencesDto,
  UpdateWorkspaceViewPreferencesDto,
  UpdateDefaultsPreferencesDto,
  UpdateAppearancePreferencesDto,
  UpdateAiPreferencesDto,
  BulkUpdatePreferencesDto,
} from './dto';

@ApiTags('User Preferences')
@Controller({ path: 'user-preferences', version: '1' })
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  // ── Bulk (cross-category) ────────────────────────────────────────────

  @Patch()
  async updateAll(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: BulkUpdatePreferencesDto,
  ) {
    return this.userPreferencesService.updateAll(workspaceId, userId, userRole, dto);
  }

  // ── Display ──────────────────────────────────────────────────────────

  @Get('display')
  async getDisplay(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.DISPLAY);
  }

  @Patch('display')
  async updateDisplay(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateDisplayPreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.DISPLAY,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── Notifications ────────────────────────────────────────────────────

  @Get('notifications')
  async getNotifications(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.NOTIFICATIONS);
  }

  @Patch('notifications')
  async updateNotifications(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.NOTIFICATIONS,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── Workspace view ───────────────────────────────────────────────────

  @Get('workspace-view')
  async getWorkspaceView(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.WORKSPACE_VIEW);
  }

  @Patch('workspace-view')
  async updateWorkspaceView(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateWorkspaceViewPreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.WORKSPACE_VIEW,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── Defaults ─────────────────────────────────────────────────────────

  @Get('defaults')
  async getDefaults(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.DEFAULTS);
  }

  @Patch('defaults')
  async updateDefaults(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateDefaultsPreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.DEFAULTS,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── Appearance ───────────────────────────────────────────────────────

  @Get('appearance')
  async getAppearance(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.APPEARANCE);
  }

  @Patch('appearance')
  async updateAppearance(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateAppearancePreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.APPEARANCE,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── AI ───────────────────────────────────────────────────────────────

  @Get('ai')
  async getAi(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.getCategory(workspaceId, userId, UserPreferencesCategory.AI);
  }

  @Patch('ai')
  async updateAi(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateAiPreferencesDto,
  ) {
    return this.userPreferencesService.updateCategory(
      workspaceId,
      userId,
      userRole,
      UserPreferencesCategory.AI,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ── Definitions (search/filter/retrieve by category and key) ───────

  @Get('definitions')
  async listDefinitions(@Query() filter: SettingDefinitionFilterDto) {
    return this.userPreferencesService.listDefinitions(filter);
  }

  @Get('definitions/:key')
  async getDefinition(@Param('key') key: string) {
    return this.userPreferencesService.getDefinition(key);
  }

  // ── Single-key resolution ────────────────────────────────────────────

  @Get('resolve/:key')
  async resolveKey(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.userPreferencesService.resolveKey(workspaceId, userId, key);
  }

  // ── Reset / history by key ───────────────────────────────────────────

  @Post('values/:key/reset')
  async resetByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.userPreferencesService.resetByKey(workspaceId, userId, userRole, key);
  }

  @Get('values/:key/history')
  async getHistoryByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ) {
    return this.userPreferencesService.getHistoryByKey(workspaceId, userId, key);
  }
}
