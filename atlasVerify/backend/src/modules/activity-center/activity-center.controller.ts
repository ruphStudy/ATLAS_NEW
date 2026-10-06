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
import { WorkspaceId, UserId } from '@common/decorators';
import { ActivityCenterService } from './activity-center.service';
import {
  RecordActivityDto,
  ActivityFilterDto,
  ActivityEntryResponseDto,
  PaginatedActivityEntryResponseDto,
  UnreadActivityCountResponseDto,
  ActivityTimelineResponseDto,
} from './dto';

@Controller({ path: 'activity-center', version: '1' })
export class ActivityCenterController {
  constructor(private readonly activityCenterService: ActivityCenterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async record(@Body() dto: RecordActivityDto): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.record(dto)) as unknown as ActivityEntryResponseDto;
  }

  @Get('feed')
  async findPersonalFeed(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    return this.activityCenterService.findPersonalFeed(workspaceId, userId, filter);
  }

  @Get('feed/workspace')
  async findWorkspaceFeed(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    return this.activityCenterService.findWorkspaceFeed(workspaceId, filter);
  }

  @Get('unread-count')
  async getUnreadCount(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<UnreadActivityCountResponseDto> {
    const unreadCount = await this.activityCenterService.getUnreadCount(workspaceId, userId);
    return { unreadCount };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<{ count: number }> {
    const count = await this.activityCenterService.markAllRead(workspaceId, userId);
    return { count };
  }

  @Get('timelines/:timelineId')
  async findTimeline(
    @WorkspaceId() workspaceId: string,
    @Param('timelineId') timelineId: string,
  ): Promise<ActivityTimelineResponseDto> {
    return this.activityCenterService.findTimeline(workspaceId, timelineId);
  }

  @Get('entities/:entityType/:entityId')
  async findEntityFeed(
    @WorkspaceId() workspaceId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    return this.activityCenterService.findEntityFeed(workspaceId, entityType, entityId, filter);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.findById(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/read')
  async markRead(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.markRead(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/pin')
  async pin(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.pin(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/unpin')
  async unpin(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.unpin(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.archive(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.restore(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Patch(':id/dismiss')
  async dismiss(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<ActivityEntryResponseDto> {
    return (await this.activityCenterService.dismiss(
      id,
      workspaceId,
      userId,
    )) as unknown as ActivityEntryResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.activityCenterService.remove(id, workspaceId, userId);
  }
}
