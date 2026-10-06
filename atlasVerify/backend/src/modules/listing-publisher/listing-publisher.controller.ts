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
import { ListingPublisherService } from './listing-publisher.service';
import {
  ArchivePublicationDto,
  BulkPublishDto,
  PublicationFilterDto,
  PublishListingDto,
  RepublishListingDto,
  RetryPublicationDto,
  UnpublishListingDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('listing-publications')
export class ListingPublisherController {
  constructor(private readonly service: ListingPublisherService) {}

  // ── Publish ───────────────────────────────────────────────────

  @Post()
  publish(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PublishListingDto,
  ) {
    return this.service.publish(workspaceId, dto, userId);
  }

  @Post('bulk')
  bulkPublish(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BulkPublishDto,
  ) {
    return this.service.bulkPublish(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: PublicationFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  // ── By Listing ────────────────────────────────────────────────

  @Get('listing/:listingId')
  findByListing(
    @Param('listingId') listingId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findByListing(listingId, workspaceId);
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

  @Post(':id/republish')
  republish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RepublishListingDto,
  ) {
    return this.service.republish(id, workspaceId, dto, userId);
  }

  @Post(':id/retry')
  retry(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RetryPublicationDto,
  ) {
    return this.service.retry(id, workspaceId, dto, userId);
  }

  @Post(':id/unpublish')
  unpublish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UnpublishListingDto,
  ) {
    return this.service.unpublish(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchivePublicationDto,
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
