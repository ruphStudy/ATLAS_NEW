import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MultiBusinessService } from './multi-business.service';
import {
  BusinessFilterDto,
  BusinessReasonDto,
  ChangeBusinessOwnershipDto,
  CreateBusinessDto,
  LinkBusinessEntityDto,
  SetParentBusinessDto,
  UpdateBusinessDto,
} from './dto';

@Controller('multi-business')
export class MultiBusinessController {
  constructor(private readonly service: MultiBusinessService) {}

  // ── Businesses ──────────────────────────────────────────────

  @Post('businesses')
  createBusiness(@Body() dto: CreateBusinessDto, @Query('userId') userId?: string) {
    return this.service.createBusiness(dto, userId);
  }

  @Get('businesses')
  findBusinesses(@Query() filter: BusinessFilterDto) {
    return this.service.findBusinesses(filter);
  }

  @Get('businesses/by-code/:workspaceId/:code')
  findBusinessByCode(@Param('workspaceId') workspaceId: string, @Param('code') code: string) {
    return this.service.findBusinessByCode(workspaceId, code);
  }

  @Get('businesses/:id')
  findBusinessById(@Param('id') id: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.findBusinessById(id, workspaceId);
  }

  @Get('businesses/:id/children')
  findChildren(@Param('id') id: string) {
    return this.service.findChildren(id);
  }

  @Patch('businesses/:id')
  updateBusiness(@Param('id') id: string, @Body() dto: UpdateBusinessDto, @Query('userId') userId?: string) {
    return this.service.updateBusiness(id, dto, userId);
  }

  @Post('businesses/:id/activate')
  activateBusiness(@Param('id') id: string, @Body() dto: BusinessReasonDto, @Query('userId') userId?: string) {
    return this.service.activateBusiness(id, userId, dto.reason);
  }

  @Post('businesses/:id/suspend')
  suspendBusiness(@Param('id') id: string, @Body() dto: BusinessReasonDto, @Query('userId') userId?: string) {
    return this.service.suspendBusiness(id, userId, dto.reason);
  }

  @Post('businesses/:id/archive')
  archiveBusiness(@Param('id') id: string, @Body() dto: BusinessReasonDto, @Query('userId') userId?: string) {
    return this.service.archiveBusiness(id, userId, dto.reason);
  }

  @Post('businesses/:id/restore')
  restoreBusiness(@Param('id') id: string, @Body() dto: BusinessReasonDto, @Query('userId') userId?: string) {
    return this.service.restoreBusiness(id, userId, dto.reason);
  }

  @Post('businesses/:id/set-default')
  setDefaultBusiness(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.setDefaultBusiness(id, userId);
  }

  @Post('businesses/:id/parent')
  setParentBusiness(@Param('id') id: string, @Body() dto: SetParentBusinessDto, @Query('userId') userId?: string) {
    return this.service.setParentBusiness(id, dto, userId);
  }

  @Post('businesses/:id/ownership')
  changeOwnership(@Param('id') id: string, @Body() dto: ChangeBusinessOwnershipDto, @Query('userId') userId?: string) {
    return this.service.changeOwnership(id, dto, userId);
  }

  @Get('businesses/:id/history')
  getBusinessHistory(@Param('id') id: string) {
    return this.service.getBusinessHistory(id);
  }

  // ── Entity Links ────────────────────────────────────────────

  @Post('businesses/:id/links')
  linkEntity(@Param('id') id: string, @Body() dto: LinkBusinessEntityDto, @Query('userId') userId?: string) {
    return this.service.linkEntity(id, dto, userId);
  }

  @Get('businesses/:id/links')
  listLinks(@Param('id') id: string) {
    return this.service.listLinks(id);
  }

  @Delete('businesses/:id/links/:entityType/:entityId')
  unlinkEntity(
    @Param('id') id: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.unlinkEntity(id, entityType, entityId, userId);
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(workspaceId);
  }
}
