import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { IssueAccessTokenDto, FileAccessTokenResponseDto, FileVersionResponseDto } from '@modules/file-management/dto';
import { DocumentManagementService } from './document-management.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  AddDocumentVersionDto,
  ApproveDocumentDto,
  RejectDocumentDto,
  RequestDocumentRevisionDto,
  DocumentFilterDto,
  AddCommentDto,
  LinkEntityDto,
  DocumentResponseDto,
  PaginatedDocumentResponseDto,
  DocumentApprovalHistoryResponseDto,
  DocumentCommentResponseDto,
  DocumentEntityLinkResponseDto,
} from './dto';

@Controller({ path: 'document-management', version: '1' })
export class DocumentManagementController {
  constructor(private readonly documentManagementService: DocumentManagementService) {}

  // ── Create / list (static routes first) ──────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.create(workspaceId, userId, dto)) as unknown as DocumentResponseDto;
  }

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: DocumentFilterDto,
  ): Promise<PaginatedDocumentResponseDto> {
    return this.documentManagementService.findAll(workspaceId, filter);
  }

  @Post('process-expiry')
  async processExpiry(): Promise<{ expiredCount: number; reminderCount: number }> {
    const [expiredCount, reminderCount] = await Promise.all([
      this.documentManagementService.processExpired(),
      this.documentManagementService.publishExpiringSoonReminders(),
    ]);
    return { expiredCount, reminderCount };
  }

  // ── Single-document reads/writes ──────────────────────────────────

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.findById(id, workspaceId)) as unknown as DocumentResponseDto;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.update(id, workspaceId, dto)) as unknown as DocumentResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.documentManagementService.remove(id, workspaceId, userId);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.documentManagementService.download(id, workspaceId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/versions')
  async listVersions(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<FileVersionResponseDto[]> {
    return (await this.documentManagementService.listVersions(id, workspaceId)) as unknown as FileVersionResponseDto[];
  }

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  async addVersion(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AddDocumentVersionDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.addVersion(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as DocumentResponseDto;
  }

  @Get(':id/history')
  async getHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DocumentApprovalHistoryResponseDto[]> {
    return (await this.documentManagementService.getHistory(
      id,
      workspaceId,
    )) as unknown as DocumentApprovalHistoryResponseDto[];
  }

  // ── Approval workflow ──────────────────────────────────────────────

  @Post(':id/submit')
  async submitForReview(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.submitForReview(
      id,
      workspaceId,
      userId,
    )) as unknown as DocumentResponseDto;
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ApproveDocumentDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.approve(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as DocumentResponseDto;
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RejectDocumentDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.reject(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as DocumentResponseDto;
  }

  @Post(':id/request-revision')
  async requestRevision(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RequestDocumentRevisionDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.requestRevision(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as DocumentResponseDto;
  }

  @Post(':id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.archive(id, workspaceId, userId)) as unknown as DocumentResponseDto;
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.restore(id, workspaceId, userId)) as unknown as DocumentResponseDto;
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.CREATED)
  async renew(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return (await this.documentManagementService.renew(id, workspaceId, userId, dto)) as unknown as DocumentResponseDto;
  }

  // ── Comments ───────────────────────────────────────────────────────

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AddCommentDto,
  ): Promise<DocumentCommentResponseDto> {
    return (await this.documentManagementService.addComment(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as DocumentCommentResponseDto;
  }

  @Get(':id/comments')
  async listComments(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DocumentCommentResponseDto[]> {
    return (await this.documentManagementService.listComments(
      id,
      workspaceId,
    )) as unknown as DocumentCommentResponseDto[];
  }

  // ── Entity links ─────────────────────────────────────────────────

  @Post(':id/links')
  @HttpCode(HttpStatus.CREATED)
  async linkEntity(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: LinkEntityDto,
  ): Promise<DocumentEntityLinkResponseDto> {
    return (await this.documentManagementService.linkEntity(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as DocumentEntityLinkResponseDto;
  }

  @Get(':id/links')
  async listLinks(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DocumentEntityLinkResponseDto[]> {
    return (await this.documentManagementService.listLinks(
      id,
      workspaceId,
    )) as unknown as DocumentEntityLinkResponseDto[];
  }

  @Delete(':id/links/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkEntity(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ): Promise<void> {
    await this.documentManagementService.unlinkEntity(id, workspaceId, userId, entityType, entityId);
  }

  // ── Secure access tokens (delegates to File Management) ──────────

  @Post(':id/access-tokens')
  @HttpCode(HttpStatus.CREATED)
  async issueAccessToken(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: IssueAccessTokenDto,
  ): Promise<FileAccessTokenResponseDto> {
    return (await this.documentManagementService.issueAccessToken(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as FileAccessTokenResponseDto;
  }
}
