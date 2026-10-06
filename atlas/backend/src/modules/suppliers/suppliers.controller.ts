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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { SuppliersService } from './suppliers.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
  UpdateSupplierStatusDto,
  SupplierFilterDto,
  SupplierListResponseDto,
  SupplierResponseDto,
  SupplierStatusHistoryResponseDto,
} from './dto';
import type { SearchSuppliersParams, SupplierProviderCode } from '@modules/supplier-provider/interfaces';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate supplier' })
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List suppliers with filtering, sorting, and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: SupplierFilterDto,
  ): Promise<SupplierListResponseDto> {
    return this.suppliersService.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get supplier statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.suppliersService.getStats(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Supplier not found' })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update supplier profile' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, workspaceId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update supplier status' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  async updateStatus(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierStatusDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.updateStatus(id, workspaceId, dto);
  }

  @Get(':id/status-history')
  @ApiOperation({ summary: 'Get supplier status change history' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: [SupplierStatusHistoryResponseDto] })
  async getStatusHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<SupplierStatusHistoryResponseDto[]> {
    return this.suppliersService.getStatusHistory(id, workspaceId);
  }

  @Get(':id/profile-history')
  @ApiOperation({ summary: 'Get supplier profile change history' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK })
  async getProfileHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.suppliersService.getProfileHistory(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a supplier' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Supplier not found' })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.suppliersService.remove(id, workspaceId);
  }

  // ── Provider operations ──────────────────────────────────────

  @Post('provider/search')
  @ApiOperation({ summary: 'Search suppliers via provider framework (returns normalized results)' })
  async searchViaProvider(
    @WorkspaceId() workspaceId: string,
    @Body() params: SearchSuppliersParams,
  ) {
    return this.suppliersService.searchViaProvider(workspaceId, params);
  }

  @Post(':id/provider/:providerCode/sync')
  @ApiOperation({ summary: 'Sync supplier profile from a specific provider' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'providerCode' })
  async syncFromProvider(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('providerCode') providerCode: SupplierProviderCode,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.syncFromProvider(id, workspaceId, providerCode);
  }

  @Get(':id/provider-identities')
  @ApiOperation({ summary: 'List all provider identities for a supplier' })
  @ApiParam({ name: 'id' })
  async getProviderIdentities(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.suppliersService.getProviderIdentities(id, workspaceId);
  }
}
