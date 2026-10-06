import { Body, Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserId } from '@common/decorators';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { SaasAdministrationService } from './saas-administration.service';
import {
  TenantFilterDto,
  SuspendTenantDto,
  TerminateTenantDto,
  ActivateTenantDto,
  AssignPlanDto,
  SubscriptionOverrideDto,
  QuotaOverrideDto,
  FeatureOverrideDto,
  AddNoteDto,
  UpdateInternalFlagsDto,
  UpdateSupportStatusDto,
  StartImpersonationDto,
  AdminActionLogFilterDto,
  PaginatedTenantResponseDto,
  TenantOverviewResponseDto,
  TenantAdminProfileResponseDto,
  AdminNoteResponseDto,
  PaginatedAdminActionLogResponseDto,
  ImpersonationResponseDto,
} from './dto';

/** Every route here is gated by `PlatformAdminGuard` — true ATLAS-staff platform admins only, per "Prevent unauthorized platform-admin access and privilege escalation." */
@UseGuards(PlatformAdminGuard)
@Controller({ path: 'saas-administration', version: '1' })
export class SaasAdministrationController {
  constructor(private readonly saasAdministrationService: SaasAdministrationService) {}

  // ── Tenant search + overview ──────────────────────────────────────

  @Get('tenants')
  async searchTenants(@Query() filter: TenantFilterDto): Promise<PaginatedTenantResponseDto> {
    return this.saasAdministrationService.searchTenants(filter);
  }

  @Get('tenants/:workspaceId')
  async getTenantOverview(@Param('workspaceId') workspaceId: string): Promise<TenantOverviewResponseDto> {
    return (await this.saasAdministrationService.getTenantOverview(workspaceId)) as unknown as TenantOverviewResponseDto;
  }

  // ── Tenant lifecycle ─────────────────────────────────────────────

  @Post('tenants/:workspaceId/activate')
  async activateTenant(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: ActivateTenantDto): Promise<void> {
    return this.saasAdministrationService.activateTenant(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/suspend')
  async suspendTenant(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: SuspendTenantDto): Promise<void> {
    return this.saasAdministrationService.suspendTenant(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/reactivate')
  async reactivateTenant(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: ActivateTenantDto): Promise<void> {
    return this.saasAdministrationService.reactivateTenant(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/terminate')
  async terminateTenant(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: TerminateTenantDto): Promise<void> {
    return this.saasAdministrationService.terminateTenant(adminUserId, workspaceId, dto);
  }

  // ── Overrides ────────────────────────────────────────────────────

  @Post('tenants/:workspaceId/plan')
  async assignPlan(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: AssignPlanDto): Promise<void> {
    return this.saasAdministrationService.assignPlan(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/subscription-override')
  async overrideSubscription(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: SubscriptionOverrideDto): Promise<void> {
    return this.saasAdministrationService.overrideSubscription(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/quota-override')
  async overrideQuota(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: QuotaOverrideDto): Promise<void> {
    return this.saasAdministrationService.overrideQuota(adminUserId, workspaceId, dto);
  }

  @Post('tenants/:workspaceId/feature-override')
  async overrideFeature(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: FeatureOverrideDto): Promise<void> {
    return this.saasAdministrationService.overrideFeature(adminUserId, workspaceId, dto);
  }

  // ── Read-only cross-tenant views ─────────────────────────────────

  @Get('tenants/:workspaceId/licenses')
  async listLicenses(@Param('workspaceId') workspaceId: string) {
    return this.saasAdministrationService.listLicensesForTenant(workspaceId);
  }

  @Get('tenants/:workspaceId/usage')
  async getUsage(@Param('workspaceId') workspaceId: string, @Query('resourceKey') resourceKey?: string) {
    return this.saasAdministrationService.getTenantUsage(workspaceId, resourceKey);
  }

  // ── Admin notes, internal flags, support status ──────────────────

  @Post('tenants/:workspaceId/notes')
  async addNote(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: AddNoteDto): Promise<AdminNoteResponseDto> {
    return (await this.saasAdministrationService.addNote(adminUserId, workspaceId, dto)) as unknown as AdminNoteResponseDto;
  }

  @Get('tenants/:workspaceId/notes')
  async listNotes(@Param('workspaceId') workspaceId: string): Promise<AdminNoteResponseDto[]> {
    return (await this.saasAdministrationService.listNotes(workspaceId)) as unknown as AdminNoteResponseDto[];
  }

  @Get('tenants/:workspaceId/profile')
  async getAdminProfile(@Param('workspaceId') workspaceId: string): Promise<TenantAdminProfileResponseDto | null> {
    return (await this.saasAdministrationService.getAdminProfile(workspaceId)) as unknown as TenantAdminProfileResponseDto | null;
  }

  @Post('tenants/:workspaceId/flags')
  async updateFlags(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: UpdateInternalFlagsDto): Promise<TenantAdminProfileResponseDto> {
    return (await this.saasAdministrationService.updateFlags(adminUserId, workspaceId, dto)) as unknown as TenantAdminProfileResponseDto;
  }

  @Post('tenants/:workspaceId/support-status')
  async updateSupportStatus(@Param('workspaceId') workspaceId: string, @UserId() adminUserId: string, @Body() dto: UpdateSupportStatusDto): Promise<TenantAdminProfileResponseDto> {
    return (await this.saasAdministrationService.updateSupportStatus(adminUserId, workspaceId, dto)) as unknown as TenantAdminProfileResponseDto;
  }

  // ── Impersonation ────────────────────────────────────────────────

  @Post('tenants/:workspaceId/impersonate')
  async startImpersonation(
    @Param('workspaceId') workspaceId: string,
    @UserId() adminUserId: string,
    @Body() dto: StartImpersonationDto,
    @Req() req: Request,
  ): Promise<ImpersonationResponseDto> {
    return this.saasAdministrationService.startImpersonation(adminUserId, workspaceId, dto, req.ip);
  }

  @Post('impersonation/:sessionId/end')
  async endImpersonation(@Param('sessionId') sessionId: string, @UserId() adminUserId: string): Promise<void> {
    return this.saasAdministrationService.endImpersonation(adminUserId, sessionId);
  }

  // ── Immutable admin action history ───────────────────────────────

  @Get('action-log')
  async listActionLog(@Query() filter: AdminActionLogFilterDto): Promise<PaginatedAdminActionLogResponseDto> {
    return this.saasAdministrationService.listActionLog(filter);
  }
}
