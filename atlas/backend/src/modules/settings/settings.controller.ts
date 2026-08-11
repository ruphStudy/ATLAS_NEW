import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SettingsService } from './settings.service';
import {
  CreateSettingDefinitionDto,
  UpdateSettingDefinitionDto,
  SettingDefinitionFilterDto,
  CreateSettingValueDto,
  UpdateSettingValueDto,
  SettingValueFilterDto,
  RollbackSettingValueDto,
  ResolveSettingsQueryDto,
  BulkUpdateSettingsDto,
  SettingDefinitionResponseDto,
  PaginatedSettingDefinitionResponseDto,
  SettingValueResponseDto,
  PaginatedSettingValueResponseDto,
  SettingValueHistoryResponseDto,
  ResolvedSettingResponseDto,
} from './dto';

@ApiTags('Settings')
@Controller({ path: 'settings', version: '1' })
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Definitions (framework catalog — not workspace-scoped) ─────────

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @UserRole() userRole: string,
    @Body() dto: CreateSettingDefinitionDto,
  ): Promise<SettingDefinitionResponseDto> {
    return (await this.settingsService.createDefinition(userRole, dto)) as unknown as SettingDefinitionResponseDto;
  }

  @Get('definitions')
  async findAllDefinitions(
    @Query() filter: SettingDefinitionFilterDto,
  ): Promise<PaginatedSettingDefinitionResponseDto> {
    return this.settingsService.findAllDefinitions(filter);
  }

  @Get('definitions/:key')
  async findDefinition(@Param('key') key: string): Promise<SettingDefinitionResponseDto> {
    return (await this.settingsService.findDefinition(key)) as unknown as SettingDefinitionResponseDto;
  }

  @Patch('definitions/:key')
  async updateDefinition(
    @Param('key') key: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateSettingDefinitionDto,
  ): Promise<SettingDefinitionResponseDto> {
    return (await this.settingsService.updateDefinition(
      key,
      userRole,
      dto,
    )) as unknown as SettingDefinitionResponseDto;
  }

  @Post('definitions/:key/deprecate')
  async deprecateDefinition(
    @Param('key') key: string,
    @UserRole() userRole: string,
  ): Promise<SettingDefinitionResponseDto> {
    return (await this.settingsService.deprecateDefinition(
      key,
      userRole,
    )) as unknown as SettingDefinitionResponseDto;
  }

  @Post('definitions/:key/archive')
  async archiveDefinition(
    @Param('key') key: string,
    @UserRole() userRole: string,
  ): Promise<SettingDefinitionResponseDto> {
    return (await this.settingsService.archiveDefinition(key, userRole)) as unknown as SettingDefinitionResponseDto;
  }

  // ── Resolution (static routes before the generic `values/:id`) ─────

  @Get('resolve')
  async resolveMany(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() query: ResolveSettingsQueryDto,
  ): Promise<Record<string, ResolvedSettingResponseDto>> {
    return (await this.settingsService.resolveMany(
      { workspaceId, userId, moduleKey: query.moduleKey },
      query,
    )) as unknown as Record<string, ResolvedSettingResponseDto>;
  }

  @Get('resolve/:key')
  async resolveOne(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query('moduleKey') moduleKey?: string,
  ): Promise<ResolvedSettingResponseDto> {
    return (await this.settingsService.resolve(
      { workspaceId, userId, moduleKey },
      key,
    )) as unknown as ResolvedSettingResponseDto;
  }

  // ── Values ───────────────────────────────────────────────────────────

  @Post('values')
  @HttpCode(HttpStatus.CREATED)
  async createValue(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateSettingValueDto,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.createValue(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as SettingValueResponseDto;
  }

  @Get('values')
  async findAllValues(
    @WorkspaceId() workspaceId: string,
    @Query() filter: SettingValueFilterDto,
  ): Promise<PaginatedSettingValueResponseDto> {
    return this.settingsService.findAll(workspaceId, filter);
  }

  @Post('values/bulk')
  async bulkUpdate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: BulkUpdateSettingsDto,
  ): Promise<SettingValueResponseDto[]> {
    return (await this.settingsService.bulkUpdate(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as SettingValueResponseDto[];
  }

  @Get('values/:id')
  async findValueById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.findById(id, workspaceId)) as unknown as SettingValueResponseDto;
  }

  @Patch('values/:id')
  async updateValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateSettingValueDto,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.updateValue(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as SettingValueResponseDto;
  }

  @Get('values/:id/history')
  async getHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<SettingValueHistoryResponseDto[]> {
    return (await this.settingsService.getHistory(id, workspaceId)) as unknown as SettingValueHistoryResponseDto[];
  }

  @Post('values/:id/publish')
  async publishValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.publishValue(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as SettingValueResponseDto;
  }

  @Post('values/:id/enable')
  async enableValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.enableValue(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as SettingValueResponseDto;
  }

  @Post('values/:id/disable')
  async disableValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.disableValue(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as SettingValueResponseDto;
  }

  @Post('values/:id/archive')
  async archiveValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.archiveValue(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as SettingValueResponseDto;
  }

  @Post('values/:id/reset')
  async resetValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.resetValue(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as SettingValueResponseDto;
  }

  @Post('values/:id/rollback')
  async rollbackValue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RollbackSettingValueDto,
  ): Promise<SettingValueResponseDto> {
    return (await this.settingsService.rollbackValue(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as SettingValueResponseDto;
  }
}
