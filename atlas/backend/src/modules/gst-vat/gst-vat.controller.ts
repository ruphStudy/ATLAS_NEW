import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GstVatService } from './gst-vat.service';
import {
  ApplyGstVatDto,
  CreateGstVatRegistrationDto,
  CreateGstVatTaxCodeDto,
  GstVatRegistrationFilterDto,
  GstVatTaxCodeFilterDto,
  GstVatTransactionFilterDto,
  RecordGstVatAdjustmentDto,
  UpdateGstVatRegistrationDto,
  UpdateGstVatTaxCodeDto,
} from './dto';

@Controller('gst-vat')
export class GstVatController {
  constructor(private readonly service: GstVatService) {}

  // ── Registrations ─────────────────────────────────────────

  @Post('registrations')
  createRegistration(@Body() dto: CreateGstVatRegistrationDto, @Query('userId') userId?: string) {
    return this.service.createRegistration(dto, userId);
  }

  @Get('registrations')
  findRegistrations(@Query() filter: GstVatRegistrationFilterDto) {
    return this.service.findRegistrations(filter);
  }

  @Get('registrations/:id')
  findRegistrationById(@Param('id') id: string) {
    return this.service.findRegistrationById(id);
  }

  @Patch('registrations/:id')
  updateRegistration(
    @Param('id') id: string,
    @Body() dto: UpdateGstVatRegistrationDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.updateRegistration(id, dto, userId);
  }

  @Get('registrations/:id/history')
  getRegistrationHistory(@Param('id') id: string) {
    return this.service.getRegistrationHistory(id);
  }

  // ── Tax Codes ─────────────────────────────────────────────

  @Post('tax-codes')
  createTaxCode(@Body() dto: CreateGstVatTaxCodeDto, @Query('userId') userId?: string) {
    return this.service.createTaxCode(dto, userId);
  }

  @Get('tax-codes')
  findTaxCodes(@Query() filter: GstVatTaxCodeFilterDto) {
    return this.service.findTaxCodes(filter);
  }

  @Patch('tax-codes/:id')
  updateTaxCode(@Param('id') id: string, @Body() dto: UpdateGstVatTaxCodeDto, @Query('userId') userId?: string) {
    return this.service.updateTaxCode(id, dto, userId);
  }

  // ── Apply / Validate ──────────────────────────────────────

  @Post('apply')
  applyGstVat(@Body() dto: ApplyGstVatDto, @Query('userId') userId?: string) {
    return this.service.applyGstVat(dto, userId);
  }

  @Post('validate')
  validateConfiguration(@Body() dto: ApplyGstVatDto) {
    return this.service.validateConfiguration({
      ...dto,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
    });
  }

  // ── Transactions ──────────────────────────────────────────

  @Get('transactions')
  getTransactions(@Query() filter: GstVatTransactionFilterDto) {
    return this.service.getTransactions(filter);
  }

  @Get('transactions/:id/adjustments')
  getAdjustments(@Param('id') id: string) {
    return this.service.getAdjustments(id);
  }

  // ── Adjustments ───────────────────────────────────────────

  @Post('adjustments')
  recordAdjustment(@Body() dto: RecordGstVatAdjustmentDto, @Query('userId') userId?: string) {
    return this.service.recordAdjustment(dto, userId);
  }
}
