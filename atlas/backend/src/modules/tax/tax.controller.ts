import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TaxService } from './tax.service';
import {
  CalculateTaxDto,
  CreateJurisdictionDto,
  CreateTaxOverrideDto,
  CreateTaxRuleDto,
  JurisdictionFilterDto,
  RollbackTaxRuleDto,
  TaxCalculationRecordFilterDto,
  TaxRuleFilterDto,
  UpdateJurisdictionDto,
  UpdateTaxRuleDto,
} from './dto';

@Controller('tax')
export class TaxController {
  constructor(private readonly service: TaxService) {}

  // ── Jurisdictions ─────────────────────────────────────────

  @Post('jurisdictions')
  registerJurisdiction(@Body() dto: CreateJurisdictionDto, @Query('userId') userId?: string) {
    return this.service.registerJurisdiction(dto, userId);
  }

  @Get('jurisdictions')
  findJurisdictions(@Query() filter: JurisdictionFilterDto) {
    return this.service.findJurisdictions(filter);
  }

  @Get('jurisdictions/:code')
  findJurisdictionByCode(@Param('code') code: string) {
    return this.service.findJurisdictionByCode(code);
  }

  @Patch('jurisdictions/:code')
  updateJurisdiction(
    @Param('code') code: string,
    @Body() dto: UpdateJurisdictionDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.updateJurisdiction(code, dto, userId);
  }

  // ── Tax Rules ─────────────────────────────────────────────

  @Post('rules')
  createRule(@Body() dto: CreateTaxRuleDto, @Query('userId') userId?: string) {
    return this.service.createRule(dto, userId);
  }

  @Get('rules')
  findRules(@Query() filter: TaxRuleFilterDto) {
    return this.service.findRules(filter);
  }

  @Get('rules/:id')
  findRuleById(@Param('id') id: string) {
    return this.service.findRuleById(id);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateTaxRuleDto, @Query('userId') userId?: string) {
    return this.service.updateRule(id, dto, userId);
  }

  @Post('rules/:id/submit')
  submitForApproval(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.submitForApproval(id, userId);
  }

  @Post('rules/:id/approve')
  approveRule(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.approveRule(id, userId);
  }

  @Post('rules/:id/publish')
  publishRule(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.publishRule(id, userId);
  }

  @Post('rules/:id/archive')
  archiveRule(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.archiveRule(id, userId);
  }

  @Post('rules/:id/rollback')
  rollbackRule(@Param('id') id: string, @Body() dto: RollbackTaxRuleDto, @Query('userId') userId?: string) {
    return this.service.rollbackRule(id, dto, userId);
  }

  @Get('rules/:id/history')
  getRuleHistory(@Param('id') id: string) {
    return this.service.getRuleHistory(id);
  }

  // ── Overrides (authorized only) ──────────────────────────

  @Post('overrides')
  createOverride(@Body() dto: CreateTaxOverrideDto, @Query('userId') userId?: string) {
    return this.service.createOverride(dto, userId);
  }

  // ── Calculation ───────────────────────────────────────────

  @Post('calculate')
  calculateTax(@Body() dto: CalculateTaxDto, @Query('userId') userId?: string) {
    return this.service.calculateTax(dto, userId);
  }

  @Get('calculations')
  getCalculationRecords(@Query() filter: TaxCalculationRecordFilterDto) {
    return this.service.getCalculationRecords(filter);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('jurisdictionCode') jurisdictionCode?: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(jurisdictionCode, workspaceId);
  }
}
