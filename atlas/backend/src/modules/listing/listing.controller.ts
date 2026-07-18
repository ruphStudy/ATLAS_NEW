import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { UserId } from '@common/decorators';
import { ListingService } from './listing.service';
import {
  ApproveListingDto,
  ArchiveListingDto,
  CreateListingDto,
  ListingFilterDto,
  ManualListingEditDto,
  PublishListingDto,
  RegenerateListingSectionsDto,
  SubmitForApprovalDto,
  CreateUniversalListingDto,
  RegenerateUniversalListingDto,
  UniversalListingFilterDto,
  TransformToMarketplaceDto,
  TransformToMultipleMarketplacesDto,
  MarketplaceListingFilterDto,
} from './dto';
import { ListingMarketplace } from './interfaces';

@UseGuards(JwtAuthGuard)
@Controller('listings')
export class ListingController {
  constructor(private readonly service: ListingService) {}

  // ── Legacy Listing API (Backward Compatible) ──────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: ListingFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  @Get('catalog/:catalogProductId')
  findByCatalogProduct(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findByCatalogProduct(catalogProductId, workspaceId);
  }

  @Get('catalog/:catalogProductId/latest')
  getLatestByCatalogProduct(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
    @Query('marketplace') marketplace?: ListingMarketplace,
  ) {
    return this.service.getLatestByCatalogProduct(catalogProductId, workspaceId, marketplace);
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.preview(id, workspaceId);
  }

  @Post(':id/regenerate')
  regenerateSections(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RegenerateListingSectionsDto,
  ) {
    return this.service.regenerateSections(id, workspaceId, dto, userId);
  }

  @Post(':id/manual-edit')
  manualEdit(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ManualListingEditDto,
  ) {
    return this.service.manualEdit(id, workspaceId, dto, userId);
  }

  @Post(':id/submit-for-approval')
  submitForApproval(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: SubmitForApprovalDto,
  ) {
    return this.service.submitForApproval(id, workspaceId, dto, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveListingDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PublishListingDto,
  ) {
    return this.service.publish(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveListingDto,
  ) {
    return this.service.archive(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }

  // ═══════════════════════════════════════════════════════════════
  // UNIVERSAL LISTING API
  // ═══════════════════════════════════════════════════════════════

  @Post('universal')
  createUniversal(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateUniversalListingDto,
  ) {
    return this.service.createUniversalListing(workspaceId, dto, userId);
  }

  @Get('universal')
  findAllUniversal(
    @WorkspaceId() workspaceId: string,
    @Query() filter: UniversalListingFilterDto,
  ) {
    return this.service.findAllUniversalListings(workspaceId, filter);
  }

  @Get('universal/catalog/:catalogProductId')
  findUniversalByCatalogProduct(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findUniversalListingsByCatalogProduct(catalogProductId, workspaceId);
  }

  @Get('universal/:id')
  findUniversalById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findUniversalListingById(id, workspaceId);
  }

  @Get('universal/:id/history')
  getUniversalHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getUniversalListingHistory(id, workspaceId);
  }

  @Get('universal/:id/preview')
  previewUniversal(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.previewUniversalListing(id, workspaceId);
  }

  @Post('universal/:id/regenerate')
  regenerateUniversal(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RegenerateUniversalListingDto,
  ) {
    return this.service.regenerateUniversalListing(id, workspaceId, dto, userId);
  }

  @Delete('universal/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUniversal(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.deleteUniversalListing(id, workspaceId);
  }

  // ═══════════════════════════════════════════════════════════════
  // MARKETPLACE LISTING API
  // ═══════════════════════════════════════════════════════════════

  @Post('universal/:id/transform')
  transformToMarketplace(
    @Param('id') universalListingId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TransformToMarketplaceDto,
  ) {
    return this.service.transformToMarketplace(universalListingId, workspaceId, dto, userId);
  }

  @Post('universal/:id/transform/bulk')
  transformToMultipleMarketplaces(
    @Param('id') universalListingId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TransformToMultipleMarketplacesDto,
  ) {
    return this.service.transformToMultipleMarketplaces(universalListingId, workspaceId, dto, userId);
  }

  @Get('universal/:id/marketplace-preview')
  previewMarketplaceTransformation(
    @Param('id') universalListingId: string,
    @WorkspaceId() workspaceId: string,
    @Query('marketplaceKey') marketplaceKey: string,
    @Query('country') country?: string,
  ) {
    return this.service.previewMarketplaceTransformation(
      universalListingId, workspaceId, marketplaceKey, country,
    );
  }

  @Get('universal/:id/marketplace-listings')
  findMarketplaceListingsByUniversalId(
    @Param('id') universalListingId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findMarketplaceListingsByUniversalId(universalListingId, workspaceId);
  }

  @Get('marketplace-listings')
  findAllMarketplaceListings(
    @WorkspaceId() workspaceId: string,
    @Query() filter: MarketplaceListingFilterDto,
  ) {
    return this.service.findAllMarketplaceListings(workspaceId, filter);
  }

  @Get('marketplace-listings/:id')
  findMarketplaceListingById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findMarketplaceListingById(id, workspaceId);
  }

  @Get('marketplace-listings/:id/history')
  getMarketplaceListingHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getMarketplaceListingHistory(id, workspaceId);
  }
}
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { UserId } from '@common/decorators';
import { ListingService } from './listing.service';
import {
  ApproveListingDto,
  ArchiveListingDto,
  CreateListingDto,
  ListingFilterDto,
  ManualListingEditDto,
  PublishListingDto,
  RegenerateListingSectionsDto,
  SubmitForApprovalDto,
} from './dto';
import { ListingMarketplace } from './interfaces';

@UseGuards(JwtAuthGuard)
@Controller('listings')
export class ListingController {
  constructor(private readonly service: ListingService) {}

  // ── Create ───────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: ListingFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  // ── By Catalog Product ────────────────────────────────────────

  @Get('catalog/:catalogProductId')
  findByCatalogProduct(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findByCatalogProduct(catalogProductId, workspaceId);
  }

  @Get('catalog/:catalogProductId/latest')
  getLatestByCatalogProduct(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
    @Query('marketplace') marketplace?: ListingMarketplace,
  ) {
    return this.service.getLatestByCatalogProduct(catalogProductId, workspaceId, marketplace);
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

  @Get(':id/preview')
  preview(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.preview(id, workspaceId);
  }

  // ── Actions ──────────────────────────────────────────────────

  @Post(':id/regenerate')
  regenerateSections(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RegenerateListingSectionsDto,
  ) {
    return this.service.regenerateSections(id, workspaceId, dto, userId);
  }

  @Post(':id/manual-edit')
  manualEdit(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ManualListingEditDto,
  ) {
    return this.service.manualEdit(id, workspaceId, dto, userId);
  }

  @Post(':id/submit-for-approval')
  submitForApproval(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: SubmitForApprovalDto,
  ) {
    return this.service.submitForApproval(id, workspaceId, dto, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveListingDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PublishListingDto,
  ) {
    return this.service.publish(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveListingDto,
  ) {
    return this.service.archive(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
