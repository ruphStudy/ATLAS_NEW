import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { AppStoreService } from './app-store.service';
import {
  RegisterAppListingDto,
  UpdateAppListingDto,
  AppListingFilterDto,
  AppStoreRequiredReasonDto,
  PublishVersionDto,
  RollbackVersionDto,
  InstallAppDto,
  UpdateInstallationDto,
  UpgradeAppDto,
  AppInstallationFilterDto,
  SubmitReviewDto,
  AppReviewFilterDto,
  AppListingResponseDto,
  PaginatedAppListingResponseDto,
  AppVersionResponseDto,
  AppInstallationResponseDto,
  PaginatedAppInstallationResponseDto,
  AppReviewResponseDto,
  PaginatedAppReviewResponseDto,
  AppHistoryResponseDto,
  AppHealthResponseDto,
} from './dto';

@Controller({ path: 'app-store', version: '1' })
export class AppStoreController {
  constructor(private readonly appStoreService: AppStoreService) {}

  // ── Catalog browsing (tenant-visible: public PUBLISHED + own PRIVATE) ──

  @UseGuards(TenantIsolationGuard)
  @Get('listings')
  async findAllListings(@WorkspaceId() workspaceId: string, @Query() filter: AppListingFilterDto): Promise<PaginatedAppListingResponseDto> {
    return this.appStoreService.findAllListings(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('listings/:key')
  async getListing(@Param('key') key: string, @WorkspaceId() workspaceId: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.getListing(key, workspaceId)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('listings/:key/history')
  async getListingHistory(@Param('key') key: string, @WorkspaceId() workspaceId: string): Promise<AppHistoryResponseDto[]> {
    return (await this.appStoreService.getListingHistory(key, workspaceId)) as unknown as AppHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Get('listings/:key/versions')
  async listVersions(@Param('key') key: string, @WorkspaceId() workspaceId: string): Promise<AppVersionResponseDto[]> {
    return (await this.appStoreService.listVersions(key, workspaceId)) as unknown as AppVersionResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Get('listings/:key/health')
  async getAppHealth(@Param('key') key: string, @WorkspaceId() workspaceId: string): Promise<AppHealthResponseDto> {
    return this.appStoreService.getAppHealth(key, workspaceId);
  }

  // ── PRIVATE app registration (tenant self-service, no platform approval) ──

  @UseGuards(TenantIsolationGuard)
  @Post('listings/private')
  async registerPrivateApp(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterAppListingDto,
  ): Promise<AppListingResponseDto> {
    return (await this.appStoreService.registerPrivateApp(workspaceId, userId, userRole, dto)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('listings/:key')
  async updateListing(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateAppListingDto,
  ): Promise<AppListingResponseDto> {
    return (await this.appStoreService.updateListing(key, workspaceId, userId, userRole, dto)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/submit-for-approval')
  async submitForApproval(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.submitForApproval(key, workspaceId, userId, userRole)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/publish-private')
  async publishPrivateApp(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.publishPrivateApp(key, workspaceId, userId, userRole)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/archive')
  async archiveListing(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.archiveListing(key, workspaceId, userId, userRole)) as unknown as AppListingResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/versions')
  async publishVersion(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: PublishVersionDto,
  ): Promise<AppVersionResponseDto> {
    return (await this.appStoreService.publishVersion(key, workspaceId, userId, userRole, dto)) as unknown as AppVersionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('versions/:versionId/deprecate')
  async deprecateVersion(@Param('versionId') versionId: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppVersionResponseDto> {
    return (await this.appStoreService.deprecateVersion(versionId, workspaceId, userId, userRole)) as unknown as AppVersionResponseDto;
  }

  // ── Platform catalog registration + approval workflow (FIRST_PARTY/PARTNER) ──

  @UseGuards(PlatformAdminGuard)
  @Post('catalog/listings')
  async registerCatalogApp(@UserId() userId: string, @Body() dto: RegisterAppListingDto): Promise<AppListingResponseDto> {
    return (await this.appStoreService.registerCatalogApp(userId, dto)) as unknown as AppListingResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Post('catalog/listings/:key/approve')
  async approveListing(@Param('key') key: string, @UserId() userId: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.approveListing(key, userId)) as unknown as AppListingResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Post('catalog/listings/:key/reject')
  async rejectListing(@Param('key') key: string, @UserId() userId: string, @Body() dto: AppStoreRequiredReasonDto): Promise<AppListingResponseDto> {
    return (await this.appStoreService.rejectListing(key, userId, dto)) as unknown as AppListingResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Post('catalog/listings/:key/suspend')
  async suspendListing(@Param('key') key: string, @UserId() userId: string, @Body() dto: AppStoreRequiredReasonDto): Promise<AppListingResponseDto> {
    return (await this.appStoreService.suspendListing(key, userId, dto)) as unknown as AppListingResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Post('catalog/listings/:key/reinstate')
  async reinstateListing(@Param('key') key: string, @UserId() userId: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.reinstateListing(key, userId)) as unknown as AppListingResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Delete('catalog/listings/:key')
  async removeListing(@Param('key') key: string, @UserId() userId: string): Promise<AppListingResponseDto> {
    return (await this.appStoreService.removeListing(key, userId)) as unknown as AppListingResponseDto;
  }

  // ── Installations ────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/install')
  async installApp(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: InstallAppDto,
  ): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.installApp(key, workspaceId, userId, userRole, dto)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('installations')
  async findAllInstallations(@WorkspaceId() workspaceId: string, @Query() filter: AppInstallationFilterDto): Promise<PaginatedAppInstallationResponseDto> {
    return this.appStoreService.findAllInstallations(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('installations/:id')
  async getInstallation(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.getInstallation(id, workspaceId)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('installations/:id/uninstall')
  async uninstallApp(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.uninstallApp(id, workspaceId, userId, userRole)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('installations/:id/enable')
  async enableApp(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.enableApp(id, workspaceId, userId, userRole)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('installations/:id/disable')
  async disableApp(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.disableApp(id, workspaceId, userId, userRole)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('installations/:id/upgrade')
  async upgradeApp(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpgradeAppDto,
  ): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.upgradeApp(id, workspaceId, userId, userRole, dto)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('installations/:id/rollback')
  async rollbackApp(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RollbackVersionDto,
  ): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.rollbackApp(id, workspaceId, userId, userRole, dto)) as unknown as AppInstallationResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('installations/:id/config')
  async updateInstallationConfig(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateInstallationDto,
  ): Promise<AppInstallationResponseDto> {
    return (await this.appStoreService.updateInstallationConfig(id, workspaceId, userId, userRole, dto)) as unknown as AppInstallationResponseDto;
  }

  // ── Reviews ──────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('listings/:key/reviews')
  async submitReview(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @Body() dto: SubmitReviewDto): Promise<AppReviewResponseDto> {
    return (await this.appStoreService.submitReview(key, workspaceId, userId, dto)) as unknown as AppReviewResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('listings/:key/reviews')
  async listReviews(@Param('key') key: string, @Query() filter: AppReviewFilterDto): Promise<PaginatedAppReviewResponseDto> {
    return this.appStoreService.listReviews(key, filter);
  }
}
