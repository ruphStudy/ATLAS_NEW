import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MultiChannelService } from './multi-channel.service';
import {
  ChannelFilterDto,
  ChannelReasonDto,
  CreateChannelProductMappingDto,
  ExecuteChannelOperationDto,
  RegisterChannelDto,
  ResolveChannelsDto,
  UpdateChannelDto,
  UpdateChannelProductMappingDto,
} from './dto';

@Controller('multi-channel')
export class MultiChannelController {
  constructor(private readonly service: MultiChannelService) {}

  // ── Channels ────────────────────────────────────────────────

  @Post('channels')
  registerChannel(@Body() dto: RegisterChannelDto, @Query('userId') userId?: string) {
    return this.service.registerChannel(dto, userId);
  }

  @Get('channels')
  findChannels(@Query() filter: ChannelFilterDto) {
    return this.service.findChannels(filter);
  }

  @Get('channels/by-key/:workspaceId/:channelKey')
  findChannelByKey(@Param('workspaceId') workspaceId: string, @Param('channelKey') channelKey: string) {
    return this.service.findChannelByKey(workspaceId, channelKey);
  }

  @Post('channels/resolve/:workspaceId')
  resolveChannels(@Param('workspaceId') workspaceId: string, @Body() dto: ResolveChannelsDto) {
    return this.service.resolveChannels(workspaceId, dto);
  }

  @Get('channels/:id')
  findChannelById(@Param('id') id: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.findChannelById(id, workspaceId);
  }

  @Patch('channels/:id')
  updateChannel(@Param('id') id: string, @Body() dto: UpdateChannelDto, @Query('userId') userId?: string) {
    return this.service.updateChannel(id, dto, userId);
  }

  @Post('channels/:id/enable')
  enableChannel(@Param('id') id: string, @Body() dto: ChannelReasonDto, @Query('userId') userId?: string) {
    return this.service.enableChannel(id, userId, dto.reason);
  }

  @Post('channels/:id/disable')
  disableChannel(@Param('id') id: string, @Body() dto: ChannelReasonDto, @Query('userId') userId?: string) {
    return this.service.disableChannel(id, userId, dto.reason);
  }

  @Post('channels/:id/archive')
  archiveChannel(@Param('id') id: string, @Body() dto: ChannelReasonDto, @Query('userId') userId?: string) {
    return this.service.archiveChannel(id, userId, dto.reason);
  }

  @Post('channels/:id/restore')
  restoreChannel(@Param('id') id: string, @Body() dto: ChannelReasonDto, @Query('userId') userId?: string) {
    return this.service.restoreChannel(id, userId, dto.reason);
  }

  @Post('channels/:id/set-default')
  setDefaultChannel(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.setDefaultChannel(id, userId);
  }

  @Get('channels/:id/history')
  getChannelHistory(@Param('id') id: string) {
    return this.service.getChannelHistory(id);
  }

  @Get('channels/:id/health')
  checkHealth(@Param('id') id: string) {
    return this.service.checkHealth(id);
  }

  @Get('channels/:id/capabilities/:capability')
  assertCapability(@Param('id') id: string, @Param('capability') capability: string) {
    return this.service.assertCapability(id, capability).then(() => ({ supported: true }));
  }

  // ── Product Mapping ─────────────────────────────────────────

  @Post('channels/:id/mappings')
  createMapping(@Param('id') id: string, @Body() dto: CreateChannelProductMappingDto, @Query('userId') userId?: string) {
    return this.service.createMapping(id, dto, userId);
  }

  @Get('channels/:id/mappings')
  findMappings(@Param('id') id: string) {
    return this.service.findMappings(id);
  }

  @Patch('channels/:id/mappings/:mappingId')
  updateMapping(@Param('id') id: string, @Param('mappingId') mappingId: string, @Body() dto: UpdateChannelProductMappingDto) {
    return this.service.updateMapping(id, mappingId, dto);
  }

  @Delete('channels/:id/mappings/:mappingId')
  deleteMapping(@Param('id') id: string, @Param('mappingId') mappingId: string, @Query('userId') userId?: string) {
    return this.service.deleteMapping(id, mappingId, userId);
  }

  // ── Idempotent Operations ───────────────────────────────────

  @Post('channels/:id/operations')
  executeOperation(@Param('id') id: string, @Body() dto: ExecuteChannelOperationDto) {
    return this.service.executeIdempotent(id, dto, async () => dto.payload ?? {});
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(workspaceId);
  }
}
