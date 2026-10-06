import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserId } from '@common/decorators';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { PlanManagementService } from './plan-management.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  PublishPlanDto,
  PlanReasonDto,
  PlanFilterDto,
  PlanResponseDto,
  PaginatedPlanResponseDto,
  PlanHistoryResponseDto,
  PlanEntitlementSnapshotResponseDto,
  PlanCompatibilityResponseDto,
} from './dto';

@Controller({ path: 'plan-management', version: '1' })
export class PlanManagementController {
  constructor(private readonly planManagementService: PlanManagementService) {}

  // ── Reads (open to any authenticated caller — plans are a global, non-tenant-scoped catalog) ──

  @Get('plans')
  async findAllPlans(@Query() filter: PlanFilterDto): Promise<PaginatedPlanResponseDto> {
    return this.planManagementService.findAllPlans(filter);
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string): Promise<PlanResponseDto> {
    return (await this.planManagementService.getPlan(id)) as unknown as PlanResponseDto;
  }

  @Get('plans/:id/history')
  async getHistory(@Param('id') id: string): Promise<PlanHistoryResponseDto[]> {
    return (await this.planManagementService.getHistory(id)) as unknown as PlanHistoryResponseDto[];
  }

  @Get('codes/:code/versions')
  async findAllVersions(@Param('code') code: string): Promise<PlanResponseDto[]> {
    return (await this.planManagementService.findAllVersions(code)) as unknown as PlanResponseDto[];
  }

  @Get('codes/:code/versions/:version')
  async getPlanByCodeAndVersion(@Param('code') code: string, @Param('version') version: string): Promise<PlanResponseDto> {
    return (await this.planManagementService.getPlanByCodeAndVersion(code, Number(version))) as unknown as PlanResponseDto;
  }

  @Get('codes/:code/effective')
  async getEffectivePlanVersion(@Param('code') code: string): Promise<PlanResponseDto | null> {
    return (await this.planManagementService.getEffectivePlanVersion(code)) as unknown as PlanResponseDto | null;
  }

  @Get('codes/:code/entitlements')
  async getEntitlementSnapshot(
    @Param('code') code: string,
    @Query('version') version?: string,
  ): Promise<PlanEntitlementSnapshotResponseDto> {
    return (await this.planManagementService.getEntitlementSnapshot(code, version ? Number(version) : undefined)) as unknown as PlanEntitlementSnapshotResponseDto;
  }

  @Get('compatibility')
  async checkCompatibility(
    @Query('fromCode') fromCode: string,
    @Query('toCode') toCode: string,
  ): Promise<PlanCompatibilityResponseDto> {
    return (await this.planManagementService.checkCompatibility(fromCode, toCode)) as unknown as PlanCompatibilityResponseDto;
  }

  // ── Writes (platform-admin only — an ordinary workspace OWNER/ADMIN must never edit the platform's plan catalog) ──

  @Post('plans')
  @UseGuards(PlatformAdminGuard)
  async createPlan(@UserId() userId: string, @Body() dto: CreatePlanDto): Promise<PlanResponseDto> {
    return (await this.planManagementService.createPlan(userId, dto)) as unknown as PlanResponseDto;
  }

  @Post('codes/:code/versions')
  @UseGuards(PlatformAdminGuard)
  async createNewVersion(
    @Param('code') code: string,
    @UserId() userId: string,
    @Body() dto: PlanReasonDto,
  ): Promise<PlanResponseDto> {
    return (await this.planManagementService.createNewVersion(code, userId, dto)) as unknown as PlanResponseDto;
  }

  @Patch('plans/:id')
  @UseGuards(PlatformAdminGuard)
  async updatePlan(@Param('id') id: string, @UserId() userId: string, @Body() dto: UpdatePlanDto): Promise<PlanResponseDto> {
    return (await this.planManagementService.updatePlan(id, userId, dto)) as unknown as PlanResponseDto;
  }

  @Post('plans/:id/publish')
  @UseGuards(PlatformAdminGuard)
  async publishPlan(@Param('id') id: string, @UserId() userId: string, @Body() dto: PublishPlanDto): Promise<PlanResponseDto> {
    return (await this.planManagementService.publishPlan(id, userId, dto)) as unknown as PlanResponseDto;
  }

  @Post('plans/:id/deprecate')
  @UseGuards(PlatformAdminGuard)
  async deprecatePlan(@Param('id') id: string, @UserId() userId: string, @Body() dto: PlanReasonDto): Promise<PlanResponseDto> {
    return (await this.planManagementService.deprecatePlan(id, userId, dto)) as unknown as PlanResponseDto;
  }

  @Post('plans/:id/archive')
  @UseGuards(PlatformAdminGuard)
  async archivePlan(@Param('id') id: string, @UserId() userId: string, @Body() dto: PlanReasonDto): Promise<PlanResponseDto> {
    return (await this.planManagementService.archivePlan(id, userId, dto)) as unknown as PlanResponseDto;
  }

  @Post('plans/:id/restore')
  @UseGuards(PlatformAdminGuard)
  async restorePlan(@Param('id') id: string, @UserId() userId: string): Promise<PlanResponseDto> {
    return (await this.planManagementService.restorePlan(id, userId)) as unknown as PlanResponseDto;
  }
}
