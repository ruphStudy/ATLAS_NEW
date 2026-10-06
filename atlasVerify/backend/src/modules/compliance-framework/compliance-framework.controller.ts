import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { ComplianceFrameworkService } from './compliance-framework.service';
import {
  CreateComplianceRuleDto,
  UpdateComplianceRuleDto,
  ComplianceRuleFilterDto,
  ValidateComplianceDto,
  SubmitComplianceEvidenceDto,
  ReviewComplianceRecordDto,
  OverrideComplianceRecordDto,
  ComplianceReasonDto,
  ComplianceRecordFilterDto,
  ComplianceRuleResponseDto,
  PaginatedComplianceRuleResponseDto,
  ComplianceRuleHistoryResponseDto,
  ComplianceRecordResponseDto,
  PaginatedComplianceRecordResponseDto,
  ComplianceRecordHistoryResponseDto,
} from './dto';

@Controller({ path: 'compliance-framework', version: '1' })
export class ComplianceFrameworkController {
  constructor(private readonly service: ComplianceFrameworkService) {}

  // ── Rules (global defaults + optional workspace overrides) ───────

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body() dto: CreateComplianceRuleDto,
    @UserId() userId?: string,
  ): Promise<ComplianceRuleResponseDto> {
    return (await this.service.createRule(dto, userId)) as unknown as ComplianceRuleResponseDto;
  }

  @Get('rules')
  async findRules(@Query() filter: ComplianceRuleFilterDto): Promise<PaginatedComplianceRuleResponseDto> {
    return this.service.findRules(filter);
  }

  @Get('rules/:id')
  async findRuleById(@Param('id') id: string): Promise<ComplianceRuleResponseDto> {
    return (await this.service.findRuleById(id)) as unknown as ComplianceRuleResponseDto;
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateComplianceRuleDto,
    @UserId() userId?: string,
  ): Promise<ComplianceRuleResponseDto> {
    return (await this.service.updateRule(id, dto, userId)) as unknown as ComplianceRuleResponseDto;
  }

  @Post('rules/:id/activate')
  async activateRule(@Param('id') id: string, @UserId() userId?: string): Promise<ComplianceRuleResponseDto> {
    return (await this.service.activateRule(id, userId)) as unknown as ComplianceRuleResponseDto;
  }

  @Post('rules/:id/archive')
  async archiveRule(
    @Param('id') id: string,
    @Body() dto: ComplianceReasonDto,
    @UserId() userId?: string,
  ): Promise<ComplianceRuleResponseDto> {
    return (await this.service.archiveRule(id, dto, userId)) as unknown as ComplianceRuleResponseDto;
  }

  @Get('rules/:id/history')
  async getRuleHistory(@Param('id') id: string): Promise<ComplianceRuleHistoryResponseDto[]> {
    return (await this.service.getRuleHistory(id)) as unknown as ComplianceRuleHistoryResponseDto[];
  }

  // ── Validation gate (called before regulated actions) ─────────────

  @Post('validate')
  async validateAction(
    @WorkspaceId() workspaceId: string,
    @Body() dto: ValidateComplianceDto,
    @UserId() userId?: string,
  ) {
    return this.service.validateAction(workspaceId, dto, userId);
  }

  // ── Records ────────────────────────────────────────────────────────

  @Get('records')
  async findRecords(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ComplianceRecordFilterDto,
  ): Promise<PaginatedComplianceRecordResponseDto> {
    return this.service.findRecords(workspaceId, filter);
  }

  @Get('records/:id')
  async findRecordById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.findRecordById(id, workspaceId)) as unknown as ComplianceRecordResponseDto;
  }

  @Get('records/:id/history')
  async getRecordHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ComplianceRecordHistoryResponseDto[]> {
    return (await this.service.getRecordHistory(id, workspaceId)) as unknown as ComplianceRecordHistoryResponseDto[];
  }

  @Post('records/:id/evidence')
  async submitEvidence(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: SubmitComplianceEvidenceDto,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.submitEvidence(id, workspaceId, userId, dto)) as unknown as ComplianceRecordResponseDto;
  }

  @Post('records/:id/review')
  async reviewRecord(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ReviewComplianceRecordDto,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.reviewRecord(id, workspaceId, userId, userRole, dto)) as unknown as ComplianceRecordResponseDto;
  }

  @Post('records/:id/waive')
  async waiveRecord(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ComplianceReasonDto,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.waiveRecord(id, workspaceId, userId, dto)) as unknown as ComplianceRecordResponseDto;
  }

  @Post('records/:id/non-applicable')
  async markNonApplicable(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ComplianceReasonDto,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.markNonApplicable(id, workspaceId, userId, dto)) as unknown as ComplianceRecordResponseDto;
  }

  @Post('records/:id/override')
  async overrideStatus(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: OverrideComplianceRecordDto,
  ): Promise<ComplianceRecordResponseDto> {
    return (await this.service.overrideStatus(id, workspaceId, userId, userRole, dto)) as unknown as ComplianceRecordResponseDto;
  }

  @Get('subjects/:subjectType/:subjectId/records')
  async getRequirementsForSubject(
    @Param('subjectType') subjectType: string,
    @Param('subjectId') subjectId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ComplianceRecordResponseDto[]> {
    return (await this.service.getRequirementsForSubject(
      workspaceId,
      subjectType,
      subjectId,
    )) as unknown as ComplianceRecordResponseDto[];
  }

  // ── Expiry (scheduler-callable; no active scheduler is wired) ────

  @Post('process-expiry')
  async processExpiry(): Promise<{ expiredCount: number; reminderCount: number }> {
    const [expiredCount, reminderCount] = await Promise.all([
      this.service.processExpired(),
      this.service.publishExpiringReminders(),
    ]);
    return { expiredCount, reminderCount };
  }

  // ── Cache ─────────────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('workspaceId') workspaceId?: string): void {
    this.service.invalidateCache(workspaceId);
  }
}
