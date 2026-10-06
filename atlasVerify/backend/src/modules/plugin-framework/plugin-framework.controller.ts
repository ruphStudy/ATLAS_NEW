import { Body, Controller, Delete, Get, Param, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { PluginFrameworkService } from './plugin-framework.service';
import {
  RegisterPluginManifestDto,
  UpdatePluginManifestDto,
  ActivatePluginDto,
  RegisterExtensionPointDto,
  CreateEventSubscriptionDto,
  TriggerHookDto,
  PluginRequiredReasonDto,
  PluginActivationFilterDto,
  PluginManifestResponseDto,
  PluginActivationResponseDto,
  PaginatedPluginActivationResponseDto,
  PluginExtensionPointResponseDto,
  PluginEventSubscriptionResponseDto,
  PluginHistoryResponseDto,
  PluginActivationHealthResponseDto,
} from './dto';

@UseGuards(TenantIsolationGuard)
@Controller({ path: 'plugin-framework', version: '1' })
export class PluginFrameworkController {
  constructor(private readonly pluginFrameworkService: PluginFrameworkService) {}

  // ── Manifests ────────────────────────────────────────────────────

  @Post('apps/:appKey/manifests')
  async registerManifest(
    @Param('appKey') appKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterPluginManifestDto,
  ): Promise<PluginManifestResponseDto> {
    return (await this.pluginFrameworkService.registerManifest(appKey, workspaceId, userId, userRole, dto)) as unknown as PluginManifestResponseDto;
  }

  @Patch('apps/:appKey/manifests/:versionId')
  async updateManifest(
    @Param('appKey') appKey: string,
    @Param('versionId') versionId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdatePluginManifestDto,
  ): Promise<PluginManifestResponseDto> {
    return (await this.pluginFrameworkService.updateManifest(appKey, versionId, workspaceId, userId, userRole, dto)) as unknown as PluginManifestResponseDto;
  }

  @Post('apps/:appKey/manifests/:versionId/deprecate')
  async deprecateManifest(
    @Param('appKey') appKey: string,
    @Param('versionId') versionId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<PluginManifestResponseDto> {
    return (await this.pluginFrameworkService.deprecateManifest(appKey, versionId, workspaceId, userId, userRole)) as unknown as PluginManifestResponseDto;
  }

  @Get('apps/:appKey/manifests/:versionId')
  async getManifest(@Param('appKey') appKey: string, @Param('versionId') versionId: string, @WorkspaceId() workspaceId: string): Promise<PluginManifestResponseDto> {
    return (await this.pluginFrameworkService.getManifest(appKey, versionId, workspaceId)) as unknown as PluginManifestResponseDto;
  }

  @Get('apps/:appKey/manifests')
  async listManifests(@Param('appKey') appKey: string, @WorkspaceId() workspaceId: string): Promise<PluginManifestResponseDto[]> {
    return (await this.pluginFrameworkService.listManifests(appKey, workspaceId)) as unknown as PluginManifestResponseDto[];
  }

  // ── Activations ──────────────────────────────────────────────────

  @Post('installations/:installationId/activate')
  async activatePlugin(
    @Param('installationId') installationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ActivatePluginDto,
  ): Promise<PluginActivationResponseDto> {
    return (await this.pluginFrameworkService.activatePlugin(installationId, workspaceId, userId, userRole, dto)) as unknown as PluginActivationResponseDto;
  }

  @Get('activations')
  async findAllActivations(@WorkspaceId() workspaceId: string, @Query() filter: PluginActivationFilterDto): Promise<PaginatedPluginActivationResponseDto> {
    return this.pluginFrameworkService.findAllActivations(workspaceId, filter);
  }

  @Get('activations/:id')
  async getActivation(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PluginActivationResponseDto> {
    return (await this.pluginFrameworkService.getActivation(id, workspaceId)) as unknown as PluginActivationResponseDto;
  }

  @Get('activations/:id/health')
  async getActivationHealth(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PluginActivationHealthResponseDto> {
    return this.pluginFrameworkService.getActivationHealth(id, workspaceId);
  }

  @Get('activations/:id/history')
  async getActivationHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PluginHistoryResponseDto[]> {
    return (await this.pluginFrameworkService.getActivationHistory(id, workspaceId)) as unknown as PluginHistoryResponseDto[];
  }

  @Post('activations/:id/deactivate')
  async deactivatePlugin(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<PluginActivationResponseDto> {
    return (await this.pluginFrameworkService.deactivatePlugin(id, workspaceId, userId, userRole)) as unknown as PluginActivationResponseDto;
  }

  @Post('activations/:id/quarantine')
  async quarantinePlugin(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: PluginRequiredReasonDto,
  ): Promise<PluginActivationResponseDto> {
    return (await this.pluginFrameworkService.quarantinePlugin(id, workspaceId, userId, userRole, dto)) as unknown as PluginActivationResponseDto;
  }

  @Post('activations/:id/reactivate')
  async reactivatePlugin(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<PluginActivationResponseDto> {
    return (await this.pluginFrameworkService.reactivatePlugin(id, workspaceId, userId, userRole)) as unknown as PluginActivationResponseDto;
  }

  // ── Extension points ─────────────────────────────────────────────

  @Post('apps/:appKey/extension-points')
  async registerExtensionPoint(
    @Param('appKey') appKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterExtensionPointDto,
  ): Promise<PluginExtensionPointResponseDto> {
    return (await this.pluginFrameworkService.registerExtensionPoint(appKey, workspaceId, userId, userRole, dto)) as unknown as PluginExtensionPointResponseDto;
  }

  @Get('apps/:appKey/extension-points')
  async listExtensionPoints(@Param('appKey') appKey: string, @WorkspaceId() workspaceId: string): Promise<PluginExtensionPointResponseDto[]> {
    return (await this.pluginFrameworkService.listExtensionPoints(appKey, workspaceId)) as unknown as PluginExtensionPointResponseDto[];
  }

  @Delete('apps/:appKey/extension-points/:extensionPointKey')
  async removeExtensionPoint(
    @Param('appKey') appKey: string,
    @Param('extensionPointKey') extensionPointKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<PluginExtensionPointResponseDto> {
    return (await this.pluginFrameworkService.removeExtensionPoint(appKey, extensionPointKey, workspaceId, userId, userRole)) as unknown as PluginExtensionPointResponseDto;
  }

  // ── Event subscriptions ──────────────────────────────────────────

  @Post('apps/:appKey/subscriptions')
  async subscribeToEvent(
    @Param('appKey') appKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateEventSubscriptionDto,
  ): Promise<PluginEventSubscriptionResponseDto> {
    return (await this.pluginFrameworkService.subscribeToEvent(appKey, workspaceId, userId, userRole, dto)) as unknown as PluginEventSubscriptionResponseDto;
  }

  @Get('apps/:appKey/subscriptions')
  async listSubscriptions(@Param('appKey') appKey: string, @WorkspaceId() workspaceId: string): Promise<PluginEventSubscriptionResponseDto[]> {
    return (await this.pluginFrameworkService.listSubscriptions(appKey, workspaceId)) as unknown as PluginEventSubscriptionResponseDto[];
  }

  @Post('subscriptions/:id/unsubscribe')
  async unsubscribe(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<PluginEventSubscriptionResponseDto> {
    return (await this.pluginFrameworkService.unsubscribe(id, workspaceId, userId, userRole)) as unknown as PluginEventSubscriptionResponseDto;
  }

  // ── Hook dispatch (manual/test trigger) ───────────────────────────

  @Post('apps/:appKey/hooks/trigger')
  async triggerHook(@Param('appKey') appKey: string, @WorkspaceId() workspaceId: string, @Body() dto: TriggerHookDto): Promise<{ queued: number; skipped: number }> {
    return this.pluginFrameworkService.triggerHook(appKey, workspaceId, dto.hookName, dto.payload);
  }
}
