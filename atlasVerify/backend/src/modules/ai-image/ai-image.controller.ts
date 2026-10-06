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
import { AiImageService } from './ai-image.service';
import {
  AiImageFilterDto,
  ApproveImageDto,
  CreateAiImageSetDto,
  ManualUploadImageDto,
  RegenerateImagesDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-images')
export class AiImageController {
  constructor(private readonly service: AiImageService) {}

  // ── Create & Trigger Generation ──────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateAiImageSetDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiImageFilterDto) {
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
  ) {
    return this.service.getLatestByCatalogProduct(catalogProductId, workspaceId);
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

  // ── Actions ──────────────────────────────────────────────────

  @Post(':id/regenerate')
  regenerateImages(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RegenerateImagesDto,
  ) {
    return this.service.regenerateImages(id, workspaceId, dto, userId);
  }

  @Post(':id/manual-upload')
  manualUpload(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ManualUploadImageDto,
  ) {
    return this.service.manualUpload(id, workspaceId, dto, userId);
  }

  @Post(':id/approve')
  approveImages(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveImageDto,
  ) {
    return this.service.approveImages(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
