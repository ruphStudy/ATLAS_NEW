import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { SubscriptionManagementService } from './subscription-management.service';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  SubscriptionReasonDto,
  AdminOverrideDto,
  SubscriptionFilterDto,
  SubscriptionResponseDto,
  PaginatedSubscriptionResponseDto,
  SubscriptionHistoryResponseDto,
  SubscriptionEntitlementResponseDto,
} from './dto';

@Controller({ path: 'subscription-management', version: '1' })
@UseGuards(TenantIsolationGuard)
export class SubscriptionManagementController {
  constructor(private readonly subscriptionManagementService: SubscriptionManagementService) {}

  // ── Effective subscription / entitlement (read-heavy, checked first for route ordering) ──

  @Get('effective')
  async getEffectiveSubscription(@WorkspaceId() workspaceId: string): Promise<SubscriptionResponseDto | null> {
    return (await this.subscriptionManagementService.getEffectiveSubscription(workspaceId)) as unknown as SubscriptionResponseDto | null;
  }

  @Get('entitlement')
  async getEntitlement(@WorkspaceId() workspaceId: string): Promise<SubscriptionEntitlementResponseDto | null> {
    return (await this.subscriptionManagementService.getEntitlementReference(workspaceId)) as unknown as SubscriptionEntitlementResponseDto | null;
  }

  @Post('process-renewals')
  async processRenewals(): Promise<{ renewed: number; cancelled: number; expired: number; suspended: number }> {
    return this.subscriptionManagementService.processRenewalsAndExpiry();
  }

  // ── Subscriptions ────────────────────────────────────────────────

  @Post('subscriptions')
  async createSubscription(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.createSubscription(workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }

  @Get('subscriptions')
  async findAllSubscriptions(
    @WorkspaceId() workspaceId: string,
    @Query() filter: SubscriptionFilterDto,
  ): Promise<PaginatedSubscriptionResponseDto> {
    return this.subscriptionManagementService.findAllSubscriptions(workspaceId, filter);
  }

  @Get('subscriptions/:id')
  async getSubscription(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.getSubscription(id, workspaceId)) as unknown as SubscriptionResponseDto;
  }

  @Get('subscriptions/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<SubscriptionHistoryResponseDto[]> {
    return (await this.subscriptionManagementService.getHistory(id, workspaceId)) as unknown as SubscriptionHistoryResponseDto[];
  }

  @Post('subscriptions/:id/activate')
  async activate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.activateSubscription(id, workspaceId, userId, userRole)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/pause')
  async pause(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SubscriptionReasonDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.pauseSubscription(id, workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/resume')
  async resume(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.resumeSubscription(id, workspaceId, userId, userRole)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/suspend')
  async suspend(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SubscriptionReasonDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.suspendSubscription(id, workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/mark-past-due')
  async markPastDue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.markPastDue(id, workspaceId, userId, userRole)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.cancelSubscription(id, workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/change-plan')
  async changePlan(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.changePlan(id, workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }

  @Post('subscriptions/:id/admin-override')
  async adminOverride(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AdminOverrideDto,
  ): Promise<SubscriptionResponseDto> {
    return (await this.subscriptionManagementService.adminOverride(id, workspaceId, userId, userRole, dto)) as unknown as SubscriptionResponseDto;
  }
}
