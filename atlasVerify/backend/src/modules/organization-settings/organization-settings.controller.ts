import { Controller, Get, Patch, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SettingScope } from '@modules/settings/interfaces';
import { SettingDefinitionFilterDto, RollbackSettingValueDto } from '@modules/settings/dto';
import { OrganizationSettingsService } from './organization-settings.service';
import { OrganizationSettingsCategory } from './constants';
import {
  UpdateOrganizationProfileDto,
  UpdateOrganizationRegionalDto,
  UpdateOrganizationOperationalDto,
  UpdateOrganizationPolicyDto,
  OrganizationSettingScopeQueryDto,
} from './dto';

@ApiTags('Organization Settings')
@Controller({ path: 'organization-settings', version: '1' })
export class OrganizationSettingsController {
  constructor(private readonly organizationSettingsService: OrganizationSettingsService) {}

  // ── Profile ──────────────────────────────────────────────────────────

  @Get('profile')
  async getProfile(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.organizationSettingsService.getCategory(workspaceId, userId, OrganizationSettingsCategory.PROFILE);
  }

  @Patch('profile')
  async updateProfile(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
    @Body() dto: UpdateOrganizationProfileDto,
  ) {
    return this.organizationSettingsService.updateCategory(
      workspaceId,
      userId,
      userRole,
      OrganizationSettingsCategory.PROFILE,
      dto as unknown as Record<string, unknown>,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  // ── Regional ─────────────────────────────────────────────────────────

  @Get('regional')
  async getRegional(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.organizationSettingsService.getCategory(workspaceId, userId, OrganizationSettingsCategory.REGIONAL);
  }

  @Patch('regional')
  async updateRegional(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
    @Body() dto: UpdateOrganizationRegionalDto,
  ) {
    return this.organizationSettingsService.updateCategory(
      workspaceId,
      userId,
      userRole,
      OrganizationSettingsCategory.REGIONAL,
      dto as unknown as Record<string, unknown>,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  // ── Operational ────────────────────────────────────────────────────

  @Get('operational')
  async getOperational(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.organizationSettingsService.getCategory(
      workspaceId,
      userId,
      OrganizationSettingsCategory.OPERATIONAL,
    );
  }

  @Patch('operational')
  async updateOperational(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
    @Body() dto: UpdateOrganizationOperationalDto,
  ) {
    return this.organizationSettingsService.updateCategory(
      workspaceId,
      userId,
      userRole,
      OrganizationSettingsCategory.OPERATIONAL,
      dto as unknown as Record<string, unknown>,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  // ── Policies ─────────────────────────────────────────────────────────

  @Get('policies')
  async getPolicies(@WorkspaceId() workspaceId: string, @UserId() userId: string) {
    return this.organizationSettingsService.getCategory(workspaceId, userId, OrganizationSettingsCategory.POLICY);
  }

  @Patch('policies')
  async updatePolicies(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
    @Body() dto: UpdateOrganizationPolicyDto,
  ) {
    return this.organizationSettingsService.updateCategory(
      workspaceId,
      userId,
      userRole,
      OrganizationSettingsCategory.POLICY,
      dto as unknown as Record<string, unknown>,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  // ── Definitions (search/filter/retrieve by category and key) ───────

  @Get('definitions')
  async listDefinitions(@Query() filter: SettingDefinitionFilterDto) {
    return this.organizationSettingsService.listDefinitions(filter);
  }

  @Get('definitions/:key')
  async getDefinition(@Param('key') key: string) {
    return this.organizationSettingsService.getDefinition(key);
  }

  // ── Single-key resolution ────────────────────────────────────────────

  @Get('resolve/:key')
  async resolveKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ) {
    return this.organizationSettingsService.resolveKey(workspaceId, userId, key);
  }

  // ── Lifecycle by key ─────────────────────────────────────────────────

  @Post('values/:key/publish')
  async publishByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
  ) {
    return this.organizationSettingsService.publishByKey(
      workspaceId,
      userId,
      userRole,
      key,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  @Post('values/:key/reset')
  async resetByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
  ) {
    return this.organizationSettingsService.resetByKey(
      workspaceId,
      userId,
      userRole,
      key,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }

  @Post('values/:key/rollback')
  async rollbackByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
    @Body() dto: RollbackSettingValueDto,
  ) {
    return this.organizationSettingsService.rollbackByKey(
      workspaceId,
      userId,
      userRole,
      key,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
      dto,
    );
  }

  @Get('values/:key/history')
  async getHistoryByKey(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @Query() scopeQuery: OrganizationSettingScopeQueryDto,
  ) {
    return this.organizationSettingsService.getHistoryByKey(
      workspaceId,
      key,
      scopeQuery.scope ?? SettingScope.WORKSPACE,
      scopeQuery.organizationId,
    );
  }
}
