import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { QuotaManagementService } from './quota-management.service';
import {
  CreateQuotaPolicyDto,
  UpdateQuotaPolicyDto,
  QuotaPolicyFilterDto,
  CreateQuotaOverrideDto,
  QuotaOverrideFilterDto,
  CheckQuotaDto,
  QuotaReasonDto,
  QuotaPolicyResponseDto,
  PaginatedQuotaPolicyResponseDto,
  QuotaOverrideResponseDto,
  PaginatedQuotaOverrideResponseDto,
  QuotaHistoryResponseDto,
  QuotaCheckResponseDto,
} from './dto';

@Controller({ path: 'quota-management', version: '1' })
export class QuotaManagementController {
  constructor(private readonly quotaManagementService: QuotaManagementService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-sweep')
  async processSweep(): Promise<{ overridesExpired: number; statesReset: number }> {
    return this.quotaManagementService.processSweep();
  }

  // ── Enforcement ──────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('check')
  async checkQuota(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CheckQuotaDto,
  ): Promise<QuotaCheckResponseDto> {
    return this.quotaManagementService.checkQuota({ workspaceId, userId, resourceKey: dto.resourceKey, feature: dto.feature, requestedQuantity: dto.requestedQuantity });
  }

  // ── Policies ─────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('policies')
  async createPolicy(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateQuotaPolicyDto,
  ): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.createPolicy(workspaceId, userId, userRole, dto)) as unknown as QuotaPolicyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('policies')
  async findAllPolicies(@WorkspaceId() workspaceId: string, @Query() filter: QuotaPolicyFilterDto): Promise<PaginatedQuotaPolicyResponseDto> {
    return this.quotaManagementService.findAllPolicies(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('policies/:id')
  async getPolicy(@Param('id') id: string): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.getPolicy(id)) as unknown as QuotaPolicyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('policies/:id')
  async updatePolicy(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateQuotaPolicyDto,
  ): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.updatePolicy(id, workspaceId, userId, userRole, dto)) as unknown as QuotaPolicyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('policies/:id/history')
  async getPolicyHistory(@Param('id') id: string): Promise<QuotaHistoryResponseDto[]> {
    return (await this.quotaManagementService.getPolicyHistory(id)) as unknown as QuotaHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('policies/:id/enable')
  async enablePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.enablePolicy(id, workspaceId, userId, userRole)) as unknown as QuotaPolicyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('policies/:id/disable')
  async disablePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.disablePolicy(id, workspaceId, userId, userRole)) as unknown as QuotaPolicyResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('policies/:id/archive')
  async archivePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<QuotaPolicyResponseDto> {
    return (await this.quotaManagementService.archivePolicy(id, workspaceId, userId, userRole)) as unknown as QuotaPolicyResponseDto;
  }

  // ── Overrides ────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('policies/:id/overrides')
  async createOverride(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateQuotaOverrideDto,
  ): Promise<QuotaOverrideResponseDto> {
    return (await this.quotaManagementService.createOverride(id, workspaceId, userId, userRole, dto)) as unknown as QuotaOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('overrides')
  async findAllOverrides(@WorkspaceId() workspaceId: string, @Query() filter: QuotaOverrideFilterDto): Promise<PaginatedQuotaOverrideResponseDto> {
    return this.quotaManagementService.findAllOverrides(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('overrides/:id')
  async getOverride(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<QuotaOverrideResponseDto> {
    return (await this.quotaManagementService.getOverride(id, workspaceId)) as unknown as QuotaOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('overrides/:id/revoke')
  async revokeOverride(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: QuotaReasonDto,
  ): Promise<QuotaOverrideResponseDto> {
    return (await this.quotaManagementService.revokeOverride(id, workspaceId, userId, userRole, dto)) as unknown as QuotaOverrideResponseDto;
  }
}
