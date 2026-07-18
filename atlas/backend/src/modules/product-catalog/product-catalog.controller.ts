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
import { ProductCatalogService } from './product-catalog.service';
import {
  ApproveCatalogDto,
  ArchiveCatalogDto,
  CatalogFilterDto,
  CreateCatalogProductDto,
  MarkAiGeneratedDto,
  PublishCatalogDto,
  RequestAiGenerationDto,
  RevertToDraftDto,
  SubmitForApprovalDto,
  UpdateCatalogProductDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('product-catalog')
export class ProductCatalogController {
  constructor(private readonly service: ProductCatalogService) {}

  // ── Create ───────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateCatalogProductDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: CatalogFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
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
    @Body() dto: UpdateCatalogProductDto,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  // ── Status Actions ────────────────────────────────────────────

  @Post(':id/request-ai')
  requestAiGeneration(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RequestAiGenerationDto,
  ) {
    return this.service.requestAiGeneration(id, workspaceId, dto, userId);
  }

  @Post(':id/mark-ai-generated')
  markAiGenerated(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: MarkAiGeneratedDto,
  ) {
    return this.service.markAiGenerated(id, workspaceId, dto, userId);
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
    @Body() dto: ApproveCatalogDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PublishCatalogDto,
  ) {
    return this.service.publish(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveCatalogDto,
  ) {
    return this.service.archive(id, workspaceId, dto, userId);
  }

  @Post(':id/revert-to-draft')
  revertToDraft(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RevertToDraftDto,
  ) {
    return this.service.revertToDraft(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
