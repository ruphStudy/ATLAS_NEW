import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceCapabilityService } from './marketplace-capability.service';
import {
  CapabilityFilterDto,
  CapabilityMatrixQueryDto,
  CreateCapabilityDto,
  CreateCapabilityOverrideDto,
  DeclareProviderCapabilityDto,
  UpdateCapabilityDto,
  UpdateDeclarationDto,
} from './dto';
import {
  CapabilityResolutionRequest,
  CapabilityValidationRequest,
  CompatibilityCheckRequest,
  MarketplaceCapabilityMatrixRequest,
} from './interfaces';
import { MarketplaceCapabilityManager } from './manager/marketplace-capability.manager';

@Controller('marketplace-capabilities')
export class MarketplaceCapabilityController {
  private readonly logger = new Logger(MarketplaceCapabilityController.name);

  constructor(
    private readonly service: MarketplaceCapabilityService,
    private readonly manager: MarketplaceCapabilityManager,
  ) {}

  // ── Capability CRUD ───────────────────────────────────────

  @Post()
  create(@Body() dto: CreateCapabilityDto) {
    return this.service.createCapability(dto);
  }

  @Get()
  findAll(@Query() filter: CapabilityFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('key/:capabilityKey')
  findByKey(@Param('capabilityKey') capabilityKey: string) {
    return this.service.findByKey(capabilityKey);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCapabilityDto) {
    return this.service.updateCapability(id, dto);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string) {
    return this.service.enableCapability(id);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string) {
    return this.service.disableCapability(id);
  }

  @Post(':id/deprecate')
  deprecate(@Param('id') id: string) {
    return this.service.deprecateCapability(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.service.archiveCapability(id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.service.restoreCapability(id);
  }

  @Post(':id/publish-version')
  publishVersion(@Param('id') id: string) {
    return this.service.publishCapabilityVersion(id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Body() body: { newKey: string }) {
    return this.service.cloneCapability(id, body.newKey);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.deleteCapability(id);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  // ── Provider Declarations ─────────────────────────────────

  @Post('declarations')
  declare(@Body() dto: DeclareProviderCapabilityDto) {
    return this.service.declareProviderCapability(dto);
  }

  @Patch('declarations/:id')
  updateDeclaration(@Param('id') id: string, @Body() dto: UpdateDeclarationDto) {
    return this.service.updateDeclaration(id, dto);
  }

  // ── Resolution ────────────────────────────────────────────

  @Post('resolve')
  resolve(@Body() request: CapabilityResolutionRequest) {
    return this.service.resolveCapability(request);
  }

  // ── Validation ────────────────────────────────────────────

  @Post('validate')
  validate(@Body() request: CapabilityValidationRequest) {
    return this.service.validateCapability(request);
  }

  // ── Compatibility ─────────────────────────────────────────

  @Post('compatibility-check')
  compatibilityCheck(@Body() request: CompatibilityCheckRequest) {
    return this.manager.checkCompatibility(request);
  }

  // ── Dependencies ──────────────────────────────────────────

  @Get('key/:capabilityKey/dependencies')
  dependencies(@Param('capabilityKey') capabilityKey: string) {
    return this.manager.resolveDependencies(capabilityKey);
  }

  // ── Overrides ─────────────────────────────────────────────

  @Post('overrides')
  createOverride(@Body() dto: CreateCapabilityOverrideDto) {
    return this.service.createOverride(dto);
  }

  // ── Discovery ─────────────────────────────────────────────

  @Get('discover/provider/:providerKey')
  discoverForProvider(@Param('providerKey') providerKey: string, @Query('workspaceId') workspaceId?: string) {
    return this.manager.discoverForProvider(providerKey, workspaceId);
  }

  // ── Matrix ────────────────────────────────────────────────

  @Get('matrix')
  getMatrix(@Query() query: CapabilityMatrixQueryDto) {
    return this.manager.getMatrix(query as unknown as MarketplaceCapabilityMatrixRequest);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('capabilityKey') capabilityKey?: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(capabilityKey, workspaceId);
  }

  // ── Metrics ───────────────────────────────────────────────

  @Get('metrics/aggregate')
  metrics() {
    return this.service.getMetrics();
  }

  @Get('metrics/:capabilityKey')
  metricsForCapability(@Param('capabilityKey') capabilityKey: string) {
    return this.service.getMetrics(capabilityKey);
  }
}
