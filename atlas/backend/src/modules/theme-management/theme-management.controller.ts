import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { ThemeManagementService } from './theme-management.service';
import {
  CreateThemeDto,
  UpdateThemeDto,
  ThemeFilterDto,
  RollbackThemeDto,
  SetActiveThemeDto,
  ThemeTokensDto,
  ThemeResponseDto,
  PaginatedThemeResponseDto,
  ThemeHistoryResponseDto,
  ContrastWarningResponseDto,
  EffectiveThemeResponseDto,
} from './dto';

@Controller({ path: 'theme-management', version: '1' })
export class ThemeManagementController {
  constructor(private readonly themeManagementService: ThemeManagementService) {}

  // ── Effective theme (resolves through Settings Framework + User Preferences) ──

  @Get('effective-theme')
  async resolveEffectiveTheme(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<EffectiveThemeResponseDto> {
    return (await this.themeManagementService.resolveEffectiveTheme(
      workspaceId,
      userId,
    )) as unknown as EffectiveThemeResponseDto;
  }

  @Post('active-theme')
  async setActiveTheme(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SetActiveThemeDto,
  ): Promise<void> {
    await this.themeManagementService.setActiveTheme(workspaceId, userId, userRole, dto);
  }

  // ── Validation ───────────────────────────────────────────────────

  @Post('validate')
  validateTokens(@Body() dto: ThemeTokensDto): ContrastWarningResponseDto[] {
    return this.themeManagementService.validateTokens(dto) as unknown as ContrastWarningResponseDto[];
  }

  // ── Themes ───────────────────────────────────────────────────────

  @Post('themes')
  async createTheme(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateThemeDto,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.createTheme(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ThemeResponseDto;
  }

  @Get('themes')
  async findAllThemes(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ThemeFilterDto,
  ): Promise<PaginatedThemeResponseDto> {
    return this.themeManagementService.findAllThemes(workspaceId, filter);
  }

  @Get('themes/:id')
  async getTheme(@Param('id') id: string): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.getTheme(id)) as unknown as ThemeResponseDto;
  }

  @Patch('themes/:id')
  async updateTheme(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateThemeDto,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.updateTheme(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ThemeResponseDto;
  }

  @Get('themes/:id/history')
  async getThemeHistory(@Param('id') id: string): Promise<ThemeHistoryResponseDto[]> {
    return (await this.themeManagementService.getThemeHistory(id)) as unknown as ThemeHistoryResponseDto[];
  }

  @Post('themes/:id/publish')
  async publishTheme(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.publishTheme(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as ThemeResponseDto;
  }

  @Post('themes/:id/archive')
  async archiveTheme(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.archiveTheme(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as ThemeResponseDto;
  }

  @Post('themes/:id/restore')
  async restoreTheme(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.restoreTheme(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as ThemeResponseDto;
  }

  @Post('themes/:id/rollback')
  async rollbackTheme(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RollbackThemeDto,
  ): Promise<ThemeResponseDto> {
    return (await this.themeManagementService.rollbackTheme(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ThemeResponseDto;
  }
}
