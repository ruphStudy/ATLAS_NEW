import { Body, Controller, Get, Post, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { WebhookFrameworkService } from './webhook-framework.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  WebhookFilterDto,
  DeliveryFilterDto,
  TestWebhookDto,
  WebhookEndpointResponseDto,
  WebhookEndpointCreatedResponseDto,
  PaginatedWebhookEndpointResponseDto,
  WebhookHistoryResponseDto,
  WebhookDeliveryResponseDto,
  PaginatedWebhookDeliveryResponseDto,
  WebhookTestResultResponseDto,
} from './dto';

@Controller({ path: 'webhook-framework', version: '1' })
export class WebhookFrameworkController {
  constructor(private readonly webhookFrameworkService: WebhookFrameworkService) {}

  // ── Endpoints ────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('endpoints')
  async createWebhook(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateWebhookDto,
  ): Promise<WebhookEndpointCreatedResponseDto> {
    return (await this.webhookFrameworkService.createWebhook(workspaceId, userId, userRole, dto)) as unknown as WebhookEndpointCreatedResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('endpoints')
  async findAllWebhooks(@WorkspaceId() workspaceId: string, @Query() filter: WebhookFilterDto): Promise<PaginatedWebhookEndpointResponseDto> {
    return this.webhookFrameworkService.findAllWebhooks(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('endpoints/:id')
  async getWebhook(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<WebhookEndpointResponseDto> {
    return (await this.webhookFrameworkService.getWebhook(id, workspaceId)) as unknown as WebhookEndpointResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('endpoints/:id')
  async updateWebhook(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateWebhookDto,
  ): Promise<WebhookEndpointResponseDto> {
    return (await this.webhookFrameworkService.updateWebhook(id, workspaceId, userId, userRole, dto)) as unknown as WebhookEndpointResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Delete('endpoints/:id')
  async deleteWebhook(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<void> {
    return this.webhookFrameworkService.deleteWebhook(id, workspaceId, userId, userRole);
  }

  @UseGuards(TenantIsolationGuard)
  @Post('endpoints/:id/enable')
  async enableWebhook(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<WebhookEndpointResponseDto> {
    return (await this.webhookFrameworkService.enableWebhook(id, workspaceId, userId, userRole)) as unknown as WebhookEndpointResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('endpoints/:id/disable')
  async disableWebhook(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<WebhookEndpointResponseDto> {
    return (await this.webhookFrameworkService.disableWebhook(id, workspaceId, userId, userRole)) as unknown as WebhookEndpointResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('endpoints/:id/rotate-secret')
  async rotateSecret(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<WebhookEndpointCreatedResponseDto> {
    return (await this.webhookFrameworkService.rotateSecret(id, workspaceId, userId, userRole)) as unknown as WebhookEndpointCreatedResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('endpoints/:id/test')
  async testWebhook(@Param('id') id: string, @WorkspaceId() workspaceId: string, @Body() dto: TestWebhookDto): Promise<WebhookTestResultResponseDto> {
    return this.webhookFrameworkService.testWebhook(id, workspaceId, dto);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('endpoints/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<WebhookHistoryResponseDto[]> {
    return (await this.webhookFrameworkService.getHistory(id, workspaceId)) as unknown as WebhookHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Get('endpoints/:id/deliveries')
  async getDeliveries(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: DeliveryFilterDto,
  ): Promise<PaginatedWebhookDeliveryResponseDto> {
    return this.webhookFrameworkService.getDeliveries(id, workspaceId, filter);
  }

  // ── Deliveries ───────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('deliveries/:deliveryId/redeliver')
  async redeliverDelivery(
    @Param('deliveryId') deliveryId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<WebhookDeliveryResponseDto> {
    return (await this.webhookFrameworkService.redeliverDelivery(deliveryId, workspaceId, userId, userRole)) as unknown as WebhookDeliveryResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('deliveries/:deliveryId/cancel')
  async cancelDelivery(
    @Param('deliveryId') deliveryId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<WebhookDeliveryResponseDto> {
    return (await this.webhookFrameworkService.cancelDelivery(deliveryId, workspaceId, userId, userRole)) as unknown as WebhookDeliveryResponseDto;
  }
}
