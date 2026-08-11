import { Body, Controller, Get, Post, Patch, Delete, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceId, UserId, UserRole, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { SsoFrameworkService } from './sso-framework.service';
import {
  RegisterSsoConnectionDto,
  UpdateSsoConnectionDto,
  SsoConnectionFilterDto,
  RotateCertificateDto,
  RotateSsoClientSecretDto,
  CreateGroupRoleMappingDto,
  UpdateGroupRoleMappingDto,
  InitiateSsoLoginDto,
  SamlCallbackDto,
  OidcSsoCallbackDto,
  SsoReasonDto,
  SsoConnectionResponseDto,
  PaginatedSsoConnectionResponseDto,
  SsoHistoryResponseDto,
  GroupRoleMappingResponseDto,
  SsoInitiateLoginResponseDto,
  SsoLoginResponseDto,
  SsoLogoutResponseDto,
} from './dto';

@Controller({ path: 'sso-framework', version: '1' })
export class SsoFrameworkController {
  constructor(private readonly ssoFrameworkService: SsoFrameworkService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-expiry')
  async processExpiry(): Promise<{ expiredRequests: number }> {
    return this.ssoFrameworkService.processExpirySweep();
  }

  // ── Public login flow (no tenant/session context yet) ─────────────

  @Public()
  @Post('discover')
  async discover(@Body() dto: InitiateSsoLoginDto): Promise<{ connectionId: string; protocol: string }> {
    return this.ssoFrameworkService.discoverConnectionByEmail(dto.email);
  }

  @Public()
  @Post('connections/:id/login/initiate')
  async initiateLogin(@Param('id') id: string): Promise<SsoInitiateLoginResponseDto> {
    return this.ssoFrameworkService.initiateLogin(id);
  }

  @Public()
  @Post('saml/:id/acs')
  async samlAcs(@Body() dto: SamlCallbackDto, @Req() req: Request): Promise<SsoLoginResponseDto> {
    return this.ssoFrameworkService.handleSamlCallback(dto, req.ip);
  }

  @Public()
  @Get('oidc/:id/callback')
  async oidcCallback(@Query() dto: OidcSsoCallbackDto, @Req() req: Request): Promise<SsoLoginResponseDto> {
    return this.ssoFrameworkService.handleOidcCallback(dto, req.ip);
  }

  // ── Logout (authenticated) ─────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('logout')
  async logout(@UserId() userId: string, @Query('connectionId') connectionId?: string): Promise<SsoLogoutResponseDto> {
    return this.ssoFrameworkService.logout(userId, connectionId);
  }

  // ── Connections ──────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('connections')
  async registerConnection(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterSsoConnectionDto,
  ): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.registerConnection(workspaceId, userId, userRole, dto)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections')
  async findAllConnections(@WorkspaceId() workspaceId: string, @Query() filter: SsoConnectionFilterDto): Promise<PaginatedSsoConnectionResponseDto> {
    return this.ssoFrameworkService.findAllConnections(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections/:id')
  async getConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.getConnection(id, workspaceId)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('connections/:id')
  async updateConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateSsoConnectionDto,
  ): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.updateConnection(id, workspaceId, userId, userRole, dto)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections/:id/history')
  async getConnectionHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<SsoHistoryResponseDto[]> {
    return (await this.ssoFrameworkService.getConnectionHistory(id, workspaceId)) as unknown as SsoHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/enable')
  async enableConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.enableConnection(id, workspaceId, userId, userRole)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/disable')
  async disableConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.disableConnection(id, workspaceId, userId, userRole)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/revoke')
  async revokeConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SsoReasonDto,
  ): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.revokeConnection(id, workspaceId, userId, userRole, dto)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/archive')
  async archiveConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.archiveConnection(id, workspaceId, userId, userRole)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/rotate-certificate')
  async rotateCertificate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RotateCertificateDto,
  ): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.rotateCertificate(id, workspaceId, userId, userRole, dto)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/rotate-client-secret')
  async rotateClientSecret(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RotateSsoClientSecretDto,
  ): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.rotateClientSecret(id, workspaceId, userId, userRole, dto)) as unknown as SsoConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/refresh-metadata')
  async refreshMetadata(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<SsoConnectionResponseDto> {
    return (await this.ssoFrameworkService.refreshMetadata(id, workspaceId, userId, userRole)) as unknown as SsoConnectionResponseDto;
  }

  // ── Group → role mappings ────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/group-role-mappings')
  async createGroupRoleMapping(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateGroupRoleMappingDto,
  ): Promise<GroupRoleMappingResponseDto> {
    return this.ssoFrameworkService.createGroupRoleMapping(id, workspaceId, userId, userRole, dto);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections/:id/group-role-mappings')
  async listGroupRoleMappings(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<GroupRoleMappingResponseDto[]> {
    return this.ssoFrameworkService.listGroupRoleMappings(id, workspaceId);
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('connections/:id/group-role-mappings/:mappingId')
  async updateGroupRoleMapping(
    @Param('id') id: string,
    @Param('mappingId') mappingId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateGroupRoleMappingDto,
  ): Promise<GroupRoleMappingResponseDto> {
    return this.ssoFrameworkService.updateGroupRoleMapping(id, mappingId, workspaceId, userId, userRole, dto);
  }

  @UseGuards(TenantIsolationGuard)
  @Delete('connections/:id/group-role-mappings/:mappingId')
  async deleteGroupRoleMapping(
    @Param('id') id: string,
    @Param('mappingId') mappingId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<void> {
    return this.ssoFrameworkService.deleteGroupRoleMapping(id, mappingId, workspaceId, userId, userRole);
  }
}
