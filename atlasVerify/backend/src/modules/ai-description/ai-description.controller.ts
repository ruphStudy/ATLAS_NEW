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
import { AiDescriptionService } from './ai-description.service';
import {
  AiDescriptionFilterDto,
  ApproveDescriptionDto,
  CreateAiDescriptionDto,
  ManualEditDto,
  RegenerateSectionsDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('ai-descriptions')
export class AiDescriptionController {
  constructor(private readonly service: AiDescriptionService) {}

  // ── Create & Trigger Generation ──────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateAiDescriptionDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiDescriptionFilterDto) {
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
  regenerateSections(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RegenerateSectionsDto,
  ) {
    return this.service.regenerateSections(id, workspaceId, dto, userId);
  }

  @Post(':id/manual-edit')
  manualEdit(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ManualEditDto,
  ) {
    return this.service.manualEdit(id, workspaceId, dto, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveDescriptionDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
