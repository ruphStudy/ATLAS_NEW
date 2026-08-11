import { Body, Controller, Get, Post, Patch, Param, Query, Req, RawBodyRequest, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorkspaceId, UserId, UserRole, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { PaymentProviderService } from './payment-provider.service';
import { PaymentWebhookService } from './webhook/payment-webhook.service';
import {
  RegisterPaymentProviderAccountDto,
  UpdatePaymentProviderAccountDto,
  ConfigurePaymentCredentialsDto,
  CreatePaymentDto,
  CapturePaymentDto,
  RefundPaymentDto,
  TransactionFilterDto,
  PaymentProviderAccountResponseDto,
  PaymentTransactionResponseDto,
  PaginatedPaymentTransactionResponseDto,
  ConnectionTestResultResponseDto,
  PaymentHealthResultResponseDto,
} from './dto';

@Controller({ path: 'payment-provider', version: '1' })
export class PaymentProviderController {
  constructor(
    private readonly paymentProviderService: PaymentProviderService,
    private readonly webhookService: PaymentWebhookService,
  ) {}

  // ── Inbound webhooks (no auth — the provider itself calls this) ───

  @Public()
  @Post('webhooks/:providerKey')
  async handleWebhook(
    @Param('providerKey') providerKey: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    // Mirrors marketplace-webhook's fallback: this app does not enable Nest's `rawBody` buffer capture,
    // so signature verification runs against the re-serialized JSON body rather than the original bytes.
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body ?? {});
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : (value ?? '')]),
    );
    const result = await this.webhookService.handleIncoming(providerKey, headers, rawBody);
    return { received: result.received };
  }

  // ── Everything else is tenant-scoped ───────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Get('accounts')
  async listAccounts(@WorkspaceId() workspaceId: string, @Query('providerKey') providerKey?: string): Promise<PaymentProviderAccountResponseDto[]> {
    return (await this.paymentProviderService.listAccounts(workspaceId, providerKey)) as unknown as PaymentProviderAccountResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('accounts')
  async registerAccount(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RegisterPaymentProviderAccountDto,
  ): Promise<PaymentProviderAccountResponseDto> {
    return (await this.paymentProviderService.registerAccount(workspaceId, userId, userRole, dto)) as unknown as PaymentProviderAccountResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('accounts/:id')
  async getAccount(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PaymentProviderAccountResponseDto> {
    return (await this.paymentProviderService.getAccount(id, workspaceId)) as unknown as PaymentProviderAccountResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('accounts/:id')
  async updateAccount(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdatePaymentProviderAccountDto,
  ): Promise<PaymentProviderAccountResponseDto> {
    return (await this.paymentProviderService.updateAccount(id, workspaceId, userId, userRole, dto)) as unknown as PaymentProviderAccountResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('accounts/:id/credentials')
  async configureCredentials(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ConfigurePaymentCredentialsDto,
  ): Promise<{ configured: boolean }> {
    await this.paymentProviderService.configureCredentials(id, workspaceId, userId, userRole, dto);
    return { configured: true };
  }

  @UseGuards(TenantIsolationGuard)
  @Post('accounts/:id/test-connection')
  async testConnection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<ConnectionTestResultResponseDto> {
    return (await this.paymentProviderService.testConnection(id, workspaceId, userId, userRole)) as unknown as ConnectionTestResultResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('health/check-all')
  async checkAllHealth(@WorkspaceId() workspaceId: string): Promise<PaymentHealthResultResponseDto[]> {
    return (await this.paymentProviderService.checkAllHealth(workspaceId)) as unknown as PaymentHealthResultResponseDto[];
  }

  // ── Payments ─────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('payments')
  async createPayment(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.createPayment(workspaceId, userId, dto)) as unknown as PaymentTransactionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('payments')
  async findAllTransactions(@WorkspaceId() workspaceId: string, @Query() filter: TransactionFilterDto): Promise<PaginatedPaymentTransactionResponseDto> {
    return this.paymentProviderService.findAllTransactions(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('payments/:id')
  async getTransaction(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.getTransaction(id, workspaceId)) as unknown as PaymentTransactionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('payments/:id/status')
  async getPaymentStatus(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.getPaymentStatus(id, workspaceId)) as unknown as PaymentTransactionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('payments/:id/capture')
  async capturePayment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CapturePaymentDto,
  ): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.capturePayment(id, workspaceId, userId, userRole, dto)) as unknown as PaymentTransactionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('payments/:id/cancel')
  async cancelPayment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.cancelPayment(id, workspaceId, userId, userRole)) as unknown as PaymentTransactionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('payments/:id/refund')
  async refundPayment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<PaymentTransactionResponseDto> {
    return (await this.paymentProviderService.refundPayment(id, workspaceId, userId, userRole, dto)) as unknown as PaymentTransactionResponseDto;
  }
}
