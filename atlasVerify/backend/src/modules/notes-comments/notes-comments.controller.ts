import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { NotesCommentsService } from './notes-comments.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilterDto,
  CreateAttachmentDto,
  NoteResponseDto,
  PaginatedNoteResponseDto,
  NoteEditHistoryResponseDto,
  NoteAttachmentResponseDto,
} from './dto';

@Controller({ path: 'notes-comments', version: '1' })
export class NotesCommentsController {
  constructor(private readonly notesCommentsService: NotesCommentsService) {}

  // ── Create / list ────────────────────────────────────────────────

  @Post('notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateNoteDto,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.createNote(workspaceId, userId, dto)) as unknown as NoteResponseDto;
  }

  @Get('notes')
  async findAll(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: NoteFilterDto,
  ): Promise<PaginatedNoteResponseDto> {
    return this.notesCommentsService.findAll(workspaceId, userId, userRole, filter);
  }

  // ── Single note/comment ────────────────────────────────────────────

  @Get('notes/:id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.findById(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  @Patch('notes/:id')
  async updateNote(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.updateNote(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as NoteResponseDto;
  }

  @Delete('notes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<void> {
    await this.notesCommentsService.remove(id, workspaceId, userId, userRole);
  }

  @Get('notes/:id/replies')
  async listReplies(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto[]> {
    return (await this.notesCommentsService.listReplies(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto[];
  }

  @Get('notes/:id/history')
  async getEditHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteEditHistoryResponseDto[]> {
    return (await this.notesCommentsService.getEditHistory(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as NoteEditHistoryResponseDto[];
  }

  // ── Pin / resolve ────────────────────────────────────────────────

  @Post('notes/:id/pin')
  async pin(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.pin(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  @Post('notes/:id/unpin')
  async unpin(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.unpin(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  @Post('notes/:id/resolve')
  async resolve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.resolve(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  @Post('notes/:id/unresolve')
  async unresolve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.unresolve(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  // ── Archive / restore ────────────────────────────────────────────

  @Post('notes/:id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.archive(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  @Post('notes/:id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteResponseDto> {
    return (await this.notesCommentsService.restore(id, workspaceId, userId, userRole)) as unknown as NoteResponseDto;
  }

  // ── Attachments ──────────────────────────────────────────────────

  @Get('notes/:id/attachments')
  async listAttachments(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<NoteAttachmentResponseDto[]> {
    return (await this.notesCommentsService.listAttachments(
      id,
      workspaceId,
      userId,
      userRole,
    )) as unknown as NoteAttachmentResponseDto[];
  }

  @Post('notes/:id/attachments')
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateAttachmentDto,
  ): Promise<NoteAttachmentResponseDto> {
    return (await this.notesCommentsService.addAttachment(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as NoteAttachmentResponseDto;
  }

  @Delete('notes/:id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<void> {
    await this.notesCommentsService.removeAttachment(id, attachmentId, workspaceId, userId, userRole);
  }
}
