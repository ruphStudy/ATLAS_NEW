import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MultiBrandService } from './multi-brand.service';
import {
  BrandFilterDto,
  BrandReasonDto,
  ChangeBrandOwnershipDto,
  CreateBrandDto,
  LinkBrandEntityDto,
  UpdateBrandDto,
} from './dto';

@Controller('multi-brand')
export class MultiBrandController {
  constructor(private readonly service: MultiBrandService) {}

  // ── Brands ──────────────────────────────────────────────────

  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto, @Query('userId') userId?: string) {
    return this.service.createBrand(dto, userId);
  }

  @Get('brands')
  findBrands(@Query() filter: BrandFilterDto) {
    return this.service.findBrands(filter);
  }

  @Get('brands/by-code/:workspaceId/:code')
  findBrandByCode(@Param('workspaceId') workspaceId: string, @Param('code') code: string) {
    return this.service.findBrandByCode(workspaceId, code);
  }

  @Get('brands/:id')
  findBrandById(@Param('id') id: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.findBrandById(id, workspaceId);
  }

  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto, @Query('userId') userId?: string) {
    return this.service.updateBrand(id, dto, userId);
  }

  @Post('brands/:id/activate')
  activateBrand(@Param('id') id: string, @Body() dto: BrandReasonDto, @Query('userId') userId?: string) {
    return this.service.activateBrand(id, userId, dto.reason);
  }

  @Post('brands/:id/deactivate')
  deactivateBrand(@Param('id') id: string, @Body() dto: BrandReasonDto, @Query('userId') userId?: string) {
    return this.service.deactivateBrand(id, userId, dto.reason);
  }

  @Post('brands/:id/archive')
  archiveBrand(@Param('id') id: string, @Body() dto: BrandReasonDto, @Query('userId') userId?: string) {
    return this.service.archiveBrand(id, userId, dto.reason);
  }

  @Post('brands/:id/restore')
  restoreBrand(@Param('id') id: string, @Body() dto: BrandReasonDto, @Query('userId') userId?: string) {
    return this.service.restoreBrand(id, userId, dto.reason);
  }

  @Post('brands/:id/set-default')
  setDefaultBrand(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.setDefaultBrand(id, userId);
  }

  @Post('brands/:id/ownership')
  changeOwnership(@Param('id') id: string, @Body() dto: ChangeBrandOwnershipDto, @Query('userId') userId?: string) {
    return this.service.changeOwnership(id, dto, userId);
  }

  @Get('brands/:id/history')
  getBrandHistory(@Param('id') id: string) {
    return this.service.getBrandHistory(id);
  }

  // ── Entity Links ────────────────────────────────────────────

  @Post('brands/:id/links')
  linkEntity(@Param('id') id: string, @Body() dto: LinkBrandEntityDto, @Query('userId') userId?: string) {
    return this.service.linkEntity(id, dto, userId);
  }

  @Get('brands/:id/links')
  listLinks(@Param('id') id: string) {
    return this.service.listLinks(id);
  }

  @Delete('brands/:id/links/:entityType/:entityId')
  unlinkEntity(
    @Param('id') id: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.unlinkEntity(id, entityType, entityId, userId);
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(workspaceId);
  }
}
