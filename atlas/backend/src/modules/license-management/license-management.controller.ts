import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { LicenseManagementService } from './license-management.service';
import {
  CreateLicenseDto,
  UpdateLicenseDto,
  LicenseFilterDto,
  ActivateLicenseDto,
  RenewLicenseDto,
  TransferLicenseDto,
  ValidateLicenseDto,
  VerifyLicenseTokenOfflineDto,
  LicenseReasonDto,
  LicenseResponseDto,
  PaginatedLicenseResponseDto,
  LicenseIssuedTokenResponseDto,
  LicenseHistoryResponseDto,
  LicenseValidationResponseDto,
  LicenseOfflineVerificationResponseDto,
} from './dto';

@Controller({ path: 'license-management', version: '1' })
export class LicenseManagementController {
  constructor(private readonly licenseManagementService: LicenseManagementService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-expiry')
  async processExpiry(): Promise<{ expired: number }> {
    return this.licenseManagementService.processExpirySweep();
  }

  // ── Validation (called by the licensed deployment itself, not necessarily a logged-in user) ──

  @Public()
  @Post('validate')
  async validate(@Body() dto: ValidateLicenseDto): Promise<LicenseValidationResponseDto> {
    const result = await this.licenseManagementService.validateLicense(dto);
    return { valid: result.valid, reason: result.reason };
  }

  @Public()
  @Post('verify-offline')
  verifyOffline(@Body() dto: VerifyLicenseTokenOfflineDto): LicenseOfflineVerificationResponseDto {
    const result = this.licenseManagementService.verifyTokenOffline(dto);
    return { valid: result.valid, reason: result.reason };
  }

  // ── Licenses ─────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('licenses')
  async createLicense(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateLicenseDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.createLicense(workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('licenses')
  async findAllLicenses(@WorkspaceId() workspaceId: string, @Query() filter: LicenseFilterDto): Promise<PaginatedLicenseResponseDto> {
    return this.licenseManagementService.findAllLicenses(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('licenses/:id')
  async getLicense(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.getLicense(id, workspaceId)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('licenses/:id')
  async updateLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateLicenseDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.updateLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('licenses/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<LicenseHistoryResponseDto[]> {
    return (await this.licenseManagementService.getHistory(id, workspaceId)) as unknown as LicenseHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/issue')
  async issueLicense(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<LicenseIssuedTokenResponseDto> {
    return (await this.licenseManagementService.issueLicense(id, workspaceId, userId, userRole)) as unknown as LicenseIssuedTokenResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/activate')
  async activateLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ActivateLicenseDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.activateLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/suspend')
  async suspendLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: LicenseReasonDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.suspendLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/reactivate')
  async reactivateLicense(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.reactivateLicense(id, workspaceId, userId, userRole)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/revoke')
  async revokeLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: LicenseReasonDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.revokeLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/renew')
  async renewLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RenewLicenseDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.renewLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/transfer')
  async transferLicense(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: TransferLicenseDto,
  ): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.transferLicense(id, workspaceId, userId, userRole, dto)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/rotate-key')
  async rotateKey(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<LicenseIssuedTokenResponseDto> {
    return (await this.licenseManagementService.rotateKey(id, workspaceId, userId, userRole)) as unknown as LicenseIssuedTokenResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('licenses/:id/refresh-entitlements')
  async refreshEntitlements(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<LicenseResponseDto> {
    return (await this.licenseManagementService.refreshEntitlements(id, workspaceId, userId, userRole)) as unknown as LicenseResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('licenses/:id/feature/:featureKey')
  async hasFeature(@Param('id') id: string, @Param('featureKey') featureKey: string, @WorkspaceId() workspaceId: string): Promise<{ enabled: boolean }> {
    return { enabled: await this.licenseManagementService.hasFeature(id, workspaceId, featureKey) };
  }

  @UseGuards(TenantIsolationGuard)
  @Get('licenses/:id/limit/:resourceKey')
  async getLimit(@Param('id') id: string, @Param('resourceKey') resourceKey: string, @WorkspaceId() workspaceId: string): Promise<{ value: unknown }> {
    return { value: await this.licenseManagementService.getLimit(id, workspaceId, resourceKey) };
  }
}
