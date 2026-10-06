import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { BackupManagementService } from './backup-management.service';
import {
  BackupEventTriggerDto,
  BackupJobFilterDto,
  BackupPolicyFilterDto,
  BackupRecordFilterDto,
  CreateBackupPolicyDto,
  TriggerBackupDto,
  UpdateBackupPolicyDto,
} from './dto';

@Controller({ path: 'backup-management', version: '1' })
export class BackupManagementController {
  constructor(private readonly service: BackupManagementService) {}

  // ── Policies ─────────────────────────────────────────────────

  @Post('policies')
  createPolicy(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string, @Body() dto: CreateBackupPolicyDto) {
    return this.service.createPolicy(workspaceId, userId, userRole, dto);
  }

  @Get('policies')
  findPolicies(@WorkspaceId() workspaceId: string, @Query() filter: BackupPolicyFilterDto) {
    return this.service.findPolicies(workspaceId, filter);
  }

  @Get('policies/:id')
  findPolicyById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findPolicyById(id, workspaceId);
  }

  @Patch('policies/:id')
  updatePolicy(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateBackupPolicyDto,
  ) {
    return this.service.updatePolicy(id, workspaceId, userId, userRole, dto);
  }

  @Post('policies/:id/activate')
  activatePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.activatePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/pause')
  pausePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.pausePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/archive')
  archivePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.archivePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/restore')
  restorePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.restorePolicy(id, workspaceId, userId, userRole);
  }

  @Get('policies/:id/history')
  getPolicyHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getPolicyHistory(id, workspaceId);
  }

  @Post('policies/:id/trigger')
  triggerBackup(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: TriggerBackupDto,
  ) {
    return this.service.triggerBackup(workspaceId, userId, userRole, id, dto);
  }

  // ── Event-triggered backups ──────────────────────────────────

  @Post('events/trigger')
  handleTriggerEvent(@Body() dto: BackupEventTriggerDto) {
    return this.service.handleTriggerEvent(dto);
  }

  // ── Scheduled polling ────────────────────────────────────────

  @Post('process-due-scheduled')
  processDueScheduledBackups() {
    return this.service.processDueScheduledBackups();
  }

  @Post('process-expiration')
  processExpirationAndCleanup() {
    return this.service.processExpirationAndCleanup();
  }

  // ── Jobs ──────────────────────────────────────────────────────

  @Get('jobs')
  findJobs(@WorkspaceId() workspaceId: string, @Query() filter: BackupJobFilterDto) {
    return this.service.findJobs(workspaceId, filter);
  }

  @Get('jobs/:id')
  getJobById(@Param('id') id: string) {
    return this.service.getJobById(id);
  }

  // ── Backup records ───────────────────────────────────────────

  @Get('records')
  findRecords(@WorkspaceId() workspaceId: string, @Query() filter: BackupRecordFilterDto) {
    return this.service.findRecords(workspaceId, filter);
  }

  @Get('records/available')
  listAvailableBackups(@WorkspaceId() workspaceId: string, @Query('targetType') targetType?: string) {
    return this.service.listAvailableBackups(workspaceId, targetType);
  }

  @Get('records/:id')
  getRecordById(@Param('id') id: string) {
    return this.service.getRecordById(id);
  }

  @Post('records/:id/verify')
  verifyBackup(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.verifyBackup(id, workspaceId, userId, userRole);
  }
}
