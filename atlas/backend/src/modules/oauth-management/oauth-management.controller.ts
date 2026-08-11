import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { OAuthManagementService } from './oauth-management.service';
import {
  RegisterOAuthClientDto,
  UpdateOAuthClientDto,
  RotateClientSecretDto,
  OAuthClientFilterDto,
  OAuthConnectionFilterDto,
  AuthorizeConnectionDto,
  OAuthCallbackDto,
  ConnectClientCredentialsDto,
  OAuthReasonDto,
  OAuthClientResponseDto,
  PaginatedOAuthClientResponseDto,
  OAuthConnectionResponseDto,
  PaginatedOAuthConnectionResponseDto,
  OAuthHistoryResponseDto,
  OAuthAuthorizeResponseDto,
  OAuthConnectionTestResultResponseDto,
} from './dto';

@Controller({ path: 'oauth-management', version: '1' })
export class OAuthManagementController {
  constructor(private readonly oauthManagementService: OAuthManagementService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-expiry')
  async processExpiry(): Promise<{ refreshed: number; refreshFailed: number; expired: number; expiredRequests: number }> {
    return this.oauthManagementService.processExpirySweep();
  }

  // ── Callback (provider redirect target — no tenant/session context, `state` carries it) ──

  @Public()
  @Get('callback')
  async callback(@Query() dto: OAuthCallbackDto): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.handleCallback(dto)) as unknown as OAuthConnectionResponseDto;
  }

  // ── Clients ──────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('clients')
  async registerClient(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterOAuthClientDto,
  ): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.registerClient(workspaceId, userId, userRole, dto)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('clients')
  async findAllClients(@WorkspaceId() workspaceId: string, @Query() filter: OAuthClientFilterDto): Promise<PaginatedOAuthClientResponseDto> {
    return this.oauthManagementService.findAllClients(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('clients/:id')
  async getClient(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.getClient(id, workspaceId)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('clients/:id')
  async updateClient(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateOAuthClientDto,
  ): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.updateClient(id, workspaceId, userId, userRole, dto)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('clients/:id/history')
  async getClientHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthHistoryResponseDto[]> {
    return (await this.oauthManagementService.getClientHistory(id, workspaceId)) as unknown as OAuthHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/enable')
  async enableClient(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.enableClient(id, workspaceId, userId, userRole)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/disable')
  async disableClient(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.disableClient(id, workspaceId, userId, userRole)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/rotate-secret')
  async rotateClientSecret(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RotateClientSecretDto,
  ): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.rotateClientSecret(id, workspaceId, userId, userRole, dto)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/revoke')
  async revokeClient(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: OAuthReasonDto,
  ): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.revokeClient(id, workspaceId, userId, userRole, dto)) as unknown as OAuthClientResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/archive')
  async archiveClient(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<OAuthClientResponseDto> {
    return (await this.oauthManagementService.archiveClient(id, workspaceId, userId, userRole)) as unknown as OAuthClientResponseDto;
  }

  // ── Connections — establishing ───────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/authorize')
  async authorizeConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AuthorizeConnectionDto,
  ): Promise<OAuthAuthorizeResponseDto> {
    return this.oauthManagementService.authorizeConnection(id, workspaceId, userId, userRole, dto);
  }

  @UseGuards(TenantIsolationGuard)
  @Post('clients/:id/connect')
  async connectClientCredentials(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ConnectClientCredentialsDto,
  ): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.connectClientCredentials(id, workspaceId, userId, userRole, dto)) as unknown as OAuthConnectionResponseDto;
  }

  // ── Connections — managing ───────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Get('connections')
  async findAllConnections(@WorkspaceId() workspaceId: string, @Query() filter: OAuthConnectionFilterDto): Promise<PaginatedOAuthConnectionResponseDto> {
    return this.oauthManagementService.findAllConnections(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections/:id')
  async getConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.getConnection(id, workspaceId)) as unknown as OAuthConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('connections/:id/history')
  async getConnectionHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthHistoryResponseDto[]> {
    return (await this.oauthManagementService.getConnectionHistory(id, workspaceId)) as unknown as OAuthHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/refresh')
  async refreshConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.refreshConnection(id, workspaceId)) as unknown as OAuthConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/revoke')
  async revokeConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: OAuthReasonDto,
  ): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.revokeConnection(id, workspaceId, userId, userRole, dto)) as unknown as OAuthConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/disconnect')
  async disconnectConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<OAuthConnectionResponseDto> {
    return (await this.oauthManagementService.disconnectConnection(id, workspaceId, userId, userRole)) as unknown as OAuthConnectionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('connections/:id/test')
  async testConnection(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<OAuthConnectionTestResultResponseDto> {
    return this.oauthManagementService.testConnection(id, workspaceId);
  }
}
