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
} from '@nestjs/common';
import { WorkspaceId, UserId } from '@common/decorators';
import { InventoryService } from './inventory.service';
import {
  ActivateInventoryItemDto,
  ArchiveInventoryItemDto,
  CreateInventoryItemDto,
  CreateUnitConversionDto,
  DeactivateInventoryItemDto,
  DiscontinueInventoryItemDto,
  InventoryItemFilterDto,
  ReactivateInventoryItemDto,
  UpdateInventoryConfigDto,
  UpdateInventoryItemDto,
} from './dto';

@Controller('inventory/items')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ── Create ───────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List ─────────────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryItemFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('by-catalog-product/:catalogProductId')
  findByCatalogProductId(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
    @Query('variantId') variantId?: string,
  ) {
    return this.service.findByCatalogProductId(catalogProductId, workspaceId, variantId ?? null);
  }

  @Get('by-catalog-product/:catalogProductId/variants')
  findVariantsByCatalogProductId(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findVariantsByCatalogProductId(catalogProductId, workspaceId);
  }

  // ── Single ───────────────────────────────────────────────────

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Update ───────────────────────────────────────────────────

  @Patch(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ActivateInventoryItemDto,
  ) {
    return this.service.activate(id, workspaceId, dto, userId);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DeactivateInventoryItemDto,
  ) {
    return this.service.deactivate(id, workspaceId, dto, userId);
  }

  @Post(':id/reactivate')
  reactivate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReactivateInventoryItemDto,
  ) {
    return this.service.reactivate(id, workspaceId, dto, userId);
  }

  @Post(':id/discontinue')
  discontinue(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DiscontinueInventoryItemDto,
  ) {
    return this.service.discontinue(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveInventoryItemDto,
  ) {
    return this.service.archive(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }

  // ── Unit Conversions ─────────────────────────────────────────

  @Post(':id/unit-conversions')
  addUnitConversion(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateUnitConversionDto,
  ) {
    return this.service.addUnitConversion(id, workspaceId, dto);
  }

  @Get(':id/unit-conversions')
  getUnitConversions(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getUnitConversions(id, workspaceId);
  }

  // ── Configuration ────────────────────────────────────────────

  @Get(':id/config')
  getConfig(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getConfig(id, workspaceId);
  }

  @Patch(':id/config')
  updateConfig(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateInventoryConfigDto,
  ) {
    return this.service.updateConfig(id, workspaceId, dto);
  }
}
