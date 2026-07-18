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
import { ListingApprovalService } from './listing-approval.service';
import {
  ApproveListingApprovalDto,
  CreateListingApprovalDto,
  ListingApprovalFilterDto,
  MarkReadyToPublishDto,
  RejectListingApprovalDto,
  RequestRevisionDto,
  ResubmitForApprovalDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('listing-approvals')
export class ListingApprovalController {
  constructor(private readonly service: ListingApprovalService) {}

  // ── Create ───────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateListingApprovalDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: ListingApprovalFilterDto) {
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

  @Get('listing/:listingId/latest')
  getLatestByListing(
    @Param('listingId') listingId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.getLatestByListing(listingId, workspaceId);
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

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveListingApprovalDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RejectListingApprovalDto,
  ) {
    return this.service.reject(id, workspaceId, dto, userId);
  }

  @Post(':id/request-revision')
  requestRevision(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.service.requestRevision(id, workspaceId, dto, userId);
  }

  @Post(':id/resubmit')
  resubmit(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ResubmitForApprovalDto,
  ) {
    return this.service.resubmit(id, workspaceId, dto, userId);
  }

  @Post(':id/mark-ready-to-publish')
  markReadyToPublish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: MarkReadyToPublishDto,
  ) {
    return this.service.markReadyToPublish(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
