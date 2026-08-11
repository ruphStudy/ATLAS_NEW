import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketplaceWebhookService } from './marketplace-webhook.service';
import {
  RegisterWebhookRequestDto,
  UpdateWebhookRequestDto,
  WebhookConfigFilterQueryDto,
  WebhookDeliveryFilterQueryDto,
  IncomingWebhookDto,
  WebhookConfigResponseDto,
  PaginatedWebhookConfigResponseDto,
  WebhookDeliveryResponseDto,
  PaginatedWebhookDeliveryResponseDto,
  WebhookSecretResponseDto,
} from './dto';

@Controller('marketplace-webhook')
export class MarketplaceWebhookController {
  constructor(private readonly service: MarketplaceWebhookService) {}

  @Post('register')
  async register(@Body() dto: RegisterWebhookRequestDto): Promise<WebhookConfigResponseDto> {
    const config = await this.service.register(dto);
    return WebhookConfigResponseDto.from(config);
  }

  @Patch(':workspaceId/:webhookId')
  async update(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWebhookRequestDto,
  ): Promise<WebhookConfigResponseDto> {
    const config = await this.service.update(webhookId, workspaceId, dto);
    return WebhookConfigResponseDto.from(config);
  }

  @Post(':workspaceId/:webhookId/enable')
  @HttpCode(HttpStatus.OK)
  async enable(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WebhookConfigResponseDto> {
    const config = await this.service.enable(webhookId, workspaceId);
    return WebhookConfigResponseDto.from(config);
  }

  @Post(':workspaceId/:webhookId/disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WebhookConfigResponseDto> {
    const config = await this.service.disable(webhookId, workspaceId);
    return WebhookConfigResponseDto.from(config);
  }

  @Delete(':workspaceId/:webhookId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.service.delete(webhookId, workspaceId);
  }

  @Post(':workspaceId/:webhookId/rotate-secret')
  async rotateSecret(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WebhookSecretResponseDto> {
    return this.service.rotateSecret(webhookId, workspaceId);
  }

  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  async handleIncoming(@Req() req: RawBodyRequest<Request>, @Body() dto: IncomingWebhookDto) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(dto.body));
    return this.service.handleIncoming(dto, rawBody);
  }

  @Get('configs')
  async findConfigs(@Query() query: WebhookConfigFilterQueryDto): Promise<PaginatedWebhookConfigResponseDto> {
    const result = await this.service.findConfigs(query);
    return {
      items: result.items.map(WebhookConfigResponseDto.from),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('configs/:workspaceId/:webhookId')
  async getConfig(
    @Param('webhookId') webhookId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WebhookConfigResponseDto> {
    const config = await this.service.getConfig(webhookId, workspaceId);
    return WebhookConfigResponseDto.from(config);
  }

  @Get('deliveries/:workspaceId/:accountId')
  async findDeliveries(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Query() query: WebhookDeliveryFilterQueryDto,
  ): Promise<PaginatedWebhookDeliveryResponseDto> {
    const result = await this.service.findDeliveries(workspaceId, accountId, query);
    return {
      items: result.items.map(WebhookDeliveryResponseDto.from),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('deliveries/:workspaceId/:deliveryId')
  async getDelivery(
    @Param('deliveryId') deliveryId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WebhookDeliveryResponseDto> {
    const delivery = await this.service.getDelivery(deliveryId, workspaceId);
    return WebhookDeliveryResponseDto.from(delivery);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
