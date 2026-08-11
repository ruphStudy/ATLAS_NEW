import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorkspaceId, UserId } from '@common/decorators';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  NotificationFilterDto,
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
  PreferenceFilterDto,
  NotificationResponseDto,
  PaginatedNotificationResponseDto,
  CreateNotificationResponseDto,
  UnreadCountResponseDto,
  NotificationPreferenceResponseDto,
} from './dto';

@ApiTags('Notifications')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateNotificationDto,
  ): Promise<CreateNotificationResponseDto> {
    return this.notificationsService.create(dto);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.markAllRead(workspaceId, userId);
    return { count };
  }

  @Get('unread-count')
  async getUnreadCount(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<UnreadCountResponseDto> {
    const unreadCount = await this.notificationsService.getUnreadCount(
      workspaceId,
      userId,
    );
    return { unreadCount };
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async setPreference(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return (await this.notificationsService.setPreference(
      userId,
      workspaceId,
      dto,
    )) as unknown as NotificationPreferenceResponseDto;
  }

  @Get('preferences')
  async findPreferences(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() filter: PreferenceFilterDto,
  ): Promise<NotificationPreferenceResponseDto[]> {
    return (await this.notificationsService.findPreferences(
      userId,
      workspaceId,
      filter,
    )) as unknown as NotificationPreferenceResponseDto[];
  }

  @Patch('preferences/:id')
  async updatePreference(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return (await this.notificationsService.updatePreference(
      id,
      userId,
      dto,
    )) as unknown as NotificationPreferenceResponseDto;
  }

  @Delete('preferences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePreference(
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.notificationsService.deletePreference(id, userId);
  }

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() filter: NotificationFilterDto,
  ): Promise<PaginatedNotificationResponseDto> {
    return this.notificationsService.findAll(workspaceId, userId, filter);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<NotificationResponseDto> {
    return (await this.notificationsService.findById(
      id,
      workspaceId,
      userId,
    )) as unknown as NotificationResponseDto;
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<NotificationResponseDto> {
    return (await this.notificationsService.markRead(
      id,
      workspaceId,
      userId,
    )) as unknown as NotificationResponseDto;
  }

  @Patch(':id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<NotificationResponseDto> {
    return (await this.notificationsService.archive(
      id,
      workspaceId,
      userId,
    )) as unknown as NotificationResponseDto;
  }

  @Patch(':id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<NotificationResponseDto> {
    return (await this.notificationsService.restore(
      id,
      workspaceId,
      userId,
    )) as unknown as NotificationResponseDto;
  }

  @Patch(':id/dismiss')
  async dismiss(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<NotificationResponseDto> {
    return (await this.notificationsService.dismiss(
      id,
      workspaceId,
      userId,
    )) as unknown as NotificationResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.notificationsService.remove(id, workspaceId, userId);
  }
}
