import { Body, Controller, Get, Post, Patch, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceId, UserId, UserRole, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { ApiKeyManagementService } from './api-key-management.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RotateApiKeyDto,
  ApiKeyReasonDto,
  ApiKeyFilterDto,
  ApiKeyResponseDto,
  ApiKeyCreatedResponseDto,
  PaginatedApiKeyResponseDto,
  ApiKeyHistoryResponseDto,
  ApiKeyValidationResponseDto,
} from './dto';

@Controller({ path: 'api-key-management', version: '1' })
export class ApiKeyManagementController {
  constructor(private readonly apiKeyManagementService: ApiKeyManagementService) {}

  // ── Validation (called by a caller presenting a key, not a JWT) ────

  @Public()
  @Post('validate')
  async validate(@Body('key') key: string, @Req() req: Request): Promise<ApiKeyValidationResponseDto> {
    const result = await this.apiKeyManagementService.validateApiKey(key, { ipAddress: req.ip });
    return { valid: result.valid, reason: result.reason, workspaceId: result.workspaceId, organizationId: result.organizationId };
  }

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-expiry')
  async processExpiry(): Promise<{ expired: number; graceExpired: number }> {
    return this.apiKeyManagementService.processExpirySweep();
  }

  // ── Keys ─────────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('keys')
  async createApiKey(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return (await this.apiKeyManagementService.createApiKey(workspaceId, userId, userRole, dto)) as unknown as ApiKeyCreatedResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('keys')
  async findAllApiKeys(@WorkspaceId() workspaceId: string, @Query() filter: ApiKeyFilterDto): Promise<PaginatedApiKeyResponseDto> {
    return this.apiKeyManagementService.findAllApiKeys(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('keys/:id')
  async getApiKey(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<ApiKeyResponseDto> {
    return (await this.apiKeyManagementService.getApiKey(id, workspaceId)) as unknown as ApiKeyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('keys/:id')
  async updateApiKey(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return (await this.apiKeyManagementService.updateApiKey(id, workspaceId, userId, userRole, dto)) as unknown as ApiKeyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('keys/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<ApiKeyHistoryResponseDto[]> {
    return (await this.apiKeyManagementService.getHistory(id, workspaceId)) as unknown as ApiKeyHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('keys/:id/rotate')
  async rotateApiKey(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RotateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return (await this.apiKeyManagementService.rotateApiKey(id, workspaceId, userId, userRole, dto)) as unknown as ApiKeyCreatedResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('keys/:id/revoke')
  async revokeApiKey(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ApiKeyReasonDto,
  ): Promise<ApiKeyResponseDto> {
    return (await this.apiKeyManagementService.revokeApiKey(id, workspaceId, userId, userRole, dto)) as unknown as ApiKeyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('keys/:id/disable')
  async disableApiKey(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ApiKeyResponseDto> {
    return (await this.apiKeyManagementService.disableApiKey(id, workspaceId, userId, userRole)) as unknown as ApiKeyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('keys/:id/enable')
  async enableApiKey(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ApiKeyResponseDto> {
    return (await this.apiKeyManagementService.enableApiKey(id, workspaceId, userId, userRole)) as unknown as ApiKeyResponseDto;
  }
}
