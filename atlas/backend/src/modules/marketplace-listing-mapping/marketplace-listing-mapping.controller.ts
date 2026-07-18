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
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { UserId } from '@common/decorators';
import { MarketplaceListingMappingService } from './marketplace-listing-mapping.service';
import {
  CreateMarketplaceSchemaDto,
  UpdateMarketplaceSchemaDto,
  CreateMappingConfigDto,
  PublishMappingConfigDto,
  RollbackMappingConfigDto,
  CreateCategoryMappingDto,
  CreateAttributeMappingDto,
  UpdateAttributeMappingDto,
  MappingFilterDto,
  CategoryMappingFilterDto,
  TransformationJobFilterDto,
  TransformListingDto,
  ValidateTransformedListingDto,
  PreviewMappingDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('marketplace-mapping')
export class MarketplaceListingMappingController {
  constructor(private readonly service: MarketplaceListingMappingService) {}

  // ── Schemas ───────────────────────────────────────────────

  @Post('schemas')
  createSchema(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateMarketplaceSchemaDto,
  ) {
    return this.service.createSchema(workspaceId, dto, userId);
  }

  @Get('schemas')
  findSchemas(
    @WorkspaceId() workspaceId: string,
    @Query() filter: MappingFilterDto,
  ) {
    return this.service.findSchemas(workspaceId, filter);
  }

  @Get('schemas/:id')
  findSchemaById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findSchemaById(id, workspaceId);
  }

  @Patch('schemas/:id')
  updateSchema(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateMarketplaceSchemaDto,
  ) {
    return this.service.updateSchema(id, workspaceId, dto, userId);
  }

  @Post('schemas/:id/publish')
  @HttpCode(HttpStatus.OK)
  publishSchema(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ) {
    return this.service.publishSchema(id, workspaceId, userId);
  }

  // ── Category Mappings ─────────────────────────────────────

  @Post('category-mappings')
  createCategoryMapping(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateCategoryMappingDto,
  ) {
    return this.service.createCategoryMapping(workspaceId, dto, userId);
  }

  @Get('category-mappings')
  findCategoryMappings(
    @WorkspaceId() workspaceId: string,
    @Query() filter: CategoryMappingFilterDto,
  ) {
    return this.service.findCategoryMappings(workspaceId, filter);
  }

  @Patch('category-mappings/:id')
  updateCategoryMapping(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateCategoryMappingDto,
  ) {
    return this.service.updateCategoryMapping(id, workspaceId, dto, userId);
  }

  // ── Attribute Mappings ────────────────────────────────────

  @Post('attribute-mappings')
  createAttributeMapping(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateAttributeMappingDto,
  ) {
    return this.service.createAttributeMapping(workspaceId, dto, userId);
  }

  @Patch('attribute-mappings/:id')
  updateAttributeMapping(
    @Param('id') id: string,
    @Body() dto: UpdateAttributeMappingDto,
  ) {
    return this.service.updateAttributeMapping(id, dto);
  }

  // ── Mapping Configs ───────────────────────────────────────

  @Post('configs')
  createMappingConfig(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateMappingConfigDto,
  ) {
    return this.service.createMappingConfig(workspaceId, dto, userId);
  }

  @Get('configs')
  findMappingConfigs(
    @WorkspaceId() workspaceId: string,
    @Query() filter: MappingFilterDto,
  ) {
    return this.service.findMappingConfigs(workspaceId, filter);
  }

  @Get('configs/:id')
  findMappingConfigById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findMappingConfigById(id, workspaceId);
  }

  @Post('configs/:id/publish')
  @HttpCode(HttpStatus.OK)
  publishMappingConfig(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PublishMappingConfigDto,
  ) {
    return this.service.publishMappingConfig(id, workspaceId, dto, userId);
  }

  @Post('configs/:id/rollback')
  @HttpCode(HttpStatus.OK)
  rollbackMappingConfig(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RollbackMappingConfigDto,
  ) {
    return this.service.rollbackMappingConfig(id, workspaceId, dto, userId);
  }

  @Get('configs/:id/history')
  getMappingVersionHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.getMappingVersionHistory(id, workspaceId);
  }

  // ── Transformation ─────────────────────────────────────────

  @Post('transform')
  transformListing(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TransformListingDto,
  ) {
    return this.service.transformListing(workspaceId, dto, userId);
  }

  @Post('transform/dry-run')
  @HttpCode(HttpStatus.OK)
  dryRunTransform(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TransformListingDto,
  ) {
    return this.service.transformListing(workspaceId, { ...dto, dryRun: true }, userId);
  }

  @Get('transform/jobs')
  findTransformationJobs(
    @WorkspaceId() workspaceId: string,
    @Query() filter: TransformationJobFilterDto,
  ) {
    return this.service.findTransformationJobs(workspaceId, filter);
  }

  @Get('transform/jobs/:id')
  getTransformationJob(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.getTransformationJob(id, workspaceId);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validatePayload(
    @WorkspaceId() workspaceId: string,
    @Body() dto: ValidateTransformedListingDto,
  ) {
    return this.service.validatePayload(workspaceId, dto);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  previewMapping(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PreviewMappingDto,
  ) {
    return this.service.transformListing(workspaceId, { ...dto, dryRun: true }, userId);
  }
}
