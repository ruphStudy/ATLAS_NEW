import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId } from '@common/decorators';
import { RegionalSettingsService } from './regional-settings.service';
import {
  CreateRegionalSettingsProfileDto,
  RegionalSettingsProfileFilterDto,
  ResolveRegionalSettingsDto,
  RollbackRegionalSettingsProfileDto,
  UpdateRegionalSettingsProfileDto,
} from './dto';

@Controller('regional-settings')
export class RegionalSettingsController {
  constructor(private readonly service: RegionalSettingsService) {}

  // ── Profiles ────────────────────────────────────────────────

  @Post('profiles')
  createProfile(@Body() dto: CreateRegionalSettingsProfileDto, @Query('userId') userId?: string) {
    return this.service.createProfile(dto, userId);
  }

  @Get('profiles')
  findProfiles(@Query() filter: RegionalSettingsProfileFilterDto) {
    return this.service.findProfiles(filter);
  }

  @Get('profiles/:id')
  findProfileById(@Param('id') id: string) {
    return this.service.findProfileById(id);
  }

  @Patch('profiles/:id')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateRegionalSettingsProfileDto, @Query('userId') userId?: string) {
    return this.service.updateProfile(id, dto, userId);
  }

  @Post('profiles/:id/publish')
  publishProfile(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.publishProfile(id, userId);
  }

  @Post('profiles/:id/archive')
  archiveProfile(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.archiveProfile(id, userId);
  }

  @Post('profiles/:id/rollback')
  rollbackProfile(@Param('id') id: string, @Body() dto: RollbackRegionalSettingsProfileDto, @Query('userId') userId?: string) {
    return this.service.rollbackProfile(id, dto, userId);
  }

  @Get('profiles/:id/history')
  getProfileHistory(@Param('id') id: string) {
    return this.service.getProfileHistory(id);
  }

  // ── Resolution ──────────────────────────────────────────────

  @Post('resolve')
  resolveEffectiveSettings(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string | undefined,
    @Body() dto: ResolveRegionalSettingsDto,
  ) {
    return this.service.resolveEffectiveSettings({
      workspaceId,
      userId,
      organizationId: dto.organizationId,
      countryCode: dto.countryCode,
      regionCode: dto.regionCode,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
    });
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@WorkspaceId() workspaceId?: string) {
    return this.service.invalidateCache(workspaceId);
  }
}
