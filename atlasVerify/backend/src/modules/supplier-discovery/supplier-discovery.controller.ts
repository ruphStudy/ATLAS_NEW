import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@modules/authentication/decorators';
import { SupplierDiscoveryService } from './supplier-discovery.service';
import {
  CreateSupplierDiscoverySessionDto,
  CreateSupplierDto,
  LinkOpportunityDto,
  SupplierDiscoverySessionListResponseDto,
  SupplierDiscoverySessionResponseDto,
  SupplierDiscoveryStatsDto,
  SupplierFilterDto,
  SupplierListResponseDto,
  SupplierResponseDto,
  SupplierSessionFilterDto,
  UpdateSupplierDto,
} from './dto';

// ── Suppliers Controller ──────────────────────────────────────

@ApiTags('Suppliers')
@ApiBearerAuth('access-token')
@Controller({ path: 'suppliers', version: '1' })
export class SuppliersController {
  constructor(private readonly service: SupplierDiscoveryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Manually create a supplier' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierResponseDto })
  create(
    @Body() dto: CreateSupplierDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierResponseDto> {
    return this.service.createSupplier(dto, workspaceId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List suppliers with filtering and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierListResponseDto })
  findAll(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() filter: SupplierFilterDto,
  ) {
    return this.service.findAllSuppliers(workspaceId, filter);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Supplier not found' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierResponseDto> {
    return this.service.findSupplierById(id, workspaceId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierResponseDto> {
    return this.service.updateSupplier(id, dto, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.service.removeSupplier(id, workspaceId);
  }

  @Post(':id/opportunities/:opportunityId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link a supplier to an opportunity' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  linkToOpportunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @Body() dto: LinkOpportunityDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ) {
    return this.service.linkToOpportunity(id, opportunityId, workspaceId, dto);
  }

  @Delete(':id/opportunities/:opportunityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink a supplier from an opportunity' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  unlinkFromOpportunity(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.service.unlinkFromOpportunity(id, opportunityId, workspaceId);
  }

  @Get('for-opportunity/:opportunityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all suppliers linked to an opportunity' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity UUID' })
  getByOpportunity(
    @Param('opportunityId', ParseUUIDPipe) opportunityId: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ) {
    return this.service.getOpportunitySuppliers(opportunityId, workspaceId);
  }
}

// ── Supplier Discovery Controller ─────────────────────────────

@ApiTags('Supplier Discovery')
@ApiBearerAuth('access-token')
@Controller({ path: 'supplier-discovery', version: '1' })
export class SupplierDiscoveryController {
  constructor(private readonly service: SupplierDiscoveryService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a supplier discovery session',
    description: 'Searches the specified provider for suppliers matching the keyword. Runs async via queue.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierDiscoverySessionResponseDto })
  createSession(
    @Body() dto: CreateSupplierDiscoverySessionDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierDiscoverySessionResponseDto> {
    return this.service.createSession(dto, workspaceId);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List supplier discovery sessions' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierDiscoverySessionListResponseDto })
  findAllSessions(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() filter: SupplierSessionFilterDto,
  ) {
    return this.service.findAllSessions(workspaceId, filter);
  }

  @Get('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a discovery session by ID' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierDiscoverySessionResponseDto })
  findSessionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierDiscoverySessionResponseDto> {
    return this.service.findSessionById(id, workspaceId);
  }

  @Get('sessions/:id/results')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all results for a discovery session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  findSessionResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ) {
    return this.service.findSessionResults(id, workspaceId);
  }

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a running or pending discovery session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierDiscoverySessionResponseDto })
  cancelSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<SupplierDiscoverySessionResponseDto> {
    return this.service.cancelSession(id, workspaceId);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get supplier discovery statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierDiscoveryStatsDto })
  getStats(@CurrentUser('workspaceId') workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all supported supplier discovery providers' })
  getSupportedProviders(): string[] {
    return this.service.getSupportedProviders();
  }
}
