import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TaskManagementService } from './task-management.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AssignTaskDto,
  UpdateProgressDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  CreateCommentDto,
  CreateAttachmentDto,
  AddWatcherDto,
  TaskActionReasonDto,
  TaskFilterDto,
  TaskResponseDto,
  PaginatedTaskResponseDto,
  TaskChecklistItemResponseDto,
  TaskCommentResponseDto,
  TaskAttachmentResponseDto,
  TaskWatcherResponseDto,
  TaskDashboardResponseDto,
} from './dto';

@Controller({ path: 'task-management', version: '1' })
export class TaskManagementController {
  constructor(private readonly taskManagementService: TaskManagementService) {}

  // ── Create / list / dashboard (static routes first) ─────────────

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.createTask(workspaceId, userId, dto)) as unknown as TaskResponseDto;
  }

  @Get('tasks')
  async findAll(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: TaskFilterDto,
  ): Promise<PaginatedTaskResponseDto> {
    return this.taskManagementService.findAll(workspaceId, userId, userRole, filter);
  }

  @Get('dashboard')
  async getDashboard(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<TaskDashboardResponseDto> {
    return this.taskManagementService.getDashboard(workspaceId, userId, userRole);
  }

  @Post('process-expiry')
  async processExpiry(): Promise<{ remindersSent: number; escalatedCount: number }> {
    return this.taskManagementService.processRemindersAndEscalations();
  }

  // ── Single task ──────────────────────────────────────────────────

  @Get('tasks/:id')
  async findById(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.findById(id, workspaceId)) as unknown as TaskResponseDto;
  }

  @Patch('tasks/:id')
  async updateTask(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.updateTask(id, workspaceId, userId, dto)) as unknown as TaskResponseDto;
  }

  @Get('tasks/:id/subtasks')
  async listSubtasks(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<TaskResponseDto[]> {
    return (await this.taskManagementService.listSubtasks(id, workspaceId)) as unknown as TaskResponseDto[];
  }

  @Patch('tasks/:id/assign')
  async assignTask(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AssignTaskDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.assignTask(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as TaskResponseDto;
  }

  @Patch('tasks/:id/progress')
  async updateProgress(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.updateProgress(id, workspaceId, userId, dto)) as unknown as TaskResponseDto;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  @Post('tasks/:id/start')
  async start(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.start(id, workspaceId, userId)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/pause')
  async pause(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.pause(id, workspaceId, userId)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/resume')
  async resume(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.resume(id, workspaceId, userId)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/complete')
  async complete(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.complete(id, workspaceId, userId)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TaskActionReasonDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.cancel(id, workspaceId, userId, dto)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TaskActionReasonDto,
  ): Promise<TaskResponseDto> {
    return (await this.taskManagementService.archive(id, workspaceId, userId, dto)) as unknown as TaskResponseDto;
  }

  @Post('tasks/:id/restore')
  async restore(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string): Promise<TaskResponseDto> {
    return (await this.taskManagementService.restore(id, workspaceId, userId)) as unknown as TaskResponseDto;
  }

  // ── Checklist ────────────────────────────────────────────────────

  @Get('tasks/:id/checklist')
  async listChecklistItems(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<TaskChecklistItemResponseDto[]> {
    return (await this.taskManagementService.listChecklistItems(id, workspaceId)) as unknown as TaskChecklistItemResponseDto[];
  }

  @Post('tasks/:id/checklist')
  @HttpCode(HttpStatus.CREATED)
  async addChecklistItem(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateChecklistItemDto,
  ): Promise<TaskChecklistItemResponseDto> {
    return (await this.taskManagementService.addChecklistItem(id, workspaceId, dto)) as unknown as TaskChecklistItemResponseDto;
  }

  @Patch('tasks/:id/checklist/:itemId')
  async updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateChecklistItemDto,
  ): Promise<TaskChecklistItemResponseDto> {
    return (await this.taskManagementService.updateChecklistItem(
      id,
      itemId,
      workspaceId,
      userId,
      dto,
    )) as unknown as TaskChecklistItemResponseDto;
  }

  @Delete('tasks/:id/checklist/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    await this.taskManagementService.removeChecklistItem(id, itemId, workspaceId);
  }

  // ── Comments ─────────────────────────────────────────────────────

  @Get('tasks/:id/comments')
  async listComments(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<TaskCommentResponseDto[]> {
    return (await this.taskManagementService.listComments(id, workspaceId)) as unknown as TaskCommentResponseDto[];
  }

  @Post('tasks/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<TaskCommentResponseDto> {
    return (await this.taskManagementService.addComment(id, workspaceId, userId, dto)) as unknown as TaskCommentResponseDto;
  }

  // ── Attachments ──────────────────────────────────────────────────

  @Get('tasks/:id/attachments')
  async listAttachments(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<TaskAttachmentResponseDto[]> {
    return (await this.taskManagementService.listAttachments(id, workspaceId)) as unknown as TaskAttachmentResponseDto[];
  }

  @Post('tasks/:id/attachments')
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateAttachmentDto,
  ): Promise<TaskAttachmentResponseDto> {
    return (await this.taskManagementService.addAttachment(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as TaskAttachmentResponseDto;
  }

  @Delete('tasks/:id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    await this.taskManagementService.removeAttachment(id, attachmentId, workspaceId);
  }

  // ── Watchers ─────────────────────────────────────────────────────

  @Get('tasks/:id/watchers')
  async listWatchers(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<TaskWatcherResponseDto[]> {
    return (await this.taskManagementService.listWatchers(id, workspaceId)) as unknown as TaskWatcherResponseDto[];
  }

  @Post('tasks/:id/watchers')
  @HttpCode(HttpStatus.CREATED)
  async addWatcher(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AddWatcherDto,
  ): Promise<TaskWatcherResponseDto> {
    return (await this.taskManagementService.addWatcher(id, workspaceId, userId, dto)) as unknown as TaskWatcherResponseDto;
  }

  @Delete('tasks/:id/watchers/:watcherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWatcher(
    @Param('id') id: string,
    @Param('watcherId') watcherId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    await this.taskManagementService.removeWatcher(id, watcherId, workspaceId);
  }
}
