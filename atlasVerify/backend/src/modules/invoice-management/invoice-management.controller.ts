import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { InvoiceManagementService } from './invoice-management.service';
import {
  GenerateInvoiceDto,
  AttachInvoiceDocumentDto,
  SendInvoiceDto,
  InvoiceReasonDto,
  InvoiceFilterDto,
  InvoiceResponseDto,
  PaginatedInvoiceResponseDto,
  InvoiceHistoryResponseDto,
} from './dto';

@Controller({ path: 'invoice-management', version: '1' })
@UseGuards(TenantIsolationGuard)
export class InvoiceManagementController {
  constructor(private readonly invoiceManagementService: InvoiceManagementService) {}

  // ── Scheduler-callable sweeps ────────────────────────────────────

  @Post('process-overdue')
  async processOverdue(): Promise<{ overdue: number }> {
    return this.invoiceManagementService.processOverdueSweep();
  }

  @Post('process-billing-sync')
  async processBillingSync(): Promise<{ synced: number; failed: number }> {
    return this.invoiceManagementService.processBillingSync();
  }

  // ── Invoices ─────────────────────────────────────────────────────

  @Post('invoices')
  async generate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: GenerateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.generateInvoice(workspaceId, userId, userRole, dto)) as unknown as InvoiceResponseDto;
  }

  @Get('invoices')
  async findAll(@WorkspaceId() workspaceId: string, @Query() filter: InvoiceFilterDto): Promise<PaginatedInvoiceResponseDto> {
    return this.invoiceManagementService.findAllInvoices(workspaceId, filter);
  }

  @Get('invoices/:id')
  async getOne(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.getInvoice(id, workspaceId)) as unknown as InvoiceResponseDto;
  }

  @Get('invoices/:id/history')
  async getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<InvoiceHistoryResponseDto[]> {
    return (await this.invoiceManagementService.getHistory(id, workspaceId)) as unknown as InvoiceHistoryResponseDto[];
  }

  @Post('invoices/:id/issue')
  async issue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.issueInvoice(id, workspaceId, userId, userRole)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/document')
  async attachDocument(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AttachInvoiceDocumentDto,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.attachDocument(id, workspaceId, userId, userRole, dto)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/send')
  async send(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SendInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.sendInvoice(id, workspaceId, userId, userRole, dto)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/download')
  async recordDownload(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.recordDownload(id, workspaceId, userId)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/void')
  async voidInvoice(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: InvoiceReasonDto,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.voidInvoice(id, workspaceId, userId, userRole, dto)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: InvoiceReasonDto,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.cancelInvoice(id, workspaceId, userId, userRole, dto)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.archiveInvoice(id, workspaceId, userId, userRole)) as unknown as InvoiceResponseDto;
  }

  @Post('invoices/:id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<InvoiceResponseDto> {
    return (await this.invoiceManagementService.restoreInvoice(id, workspaceId, userId, userRole)) as unknown as InvoiceResponseDto;
  }
}
