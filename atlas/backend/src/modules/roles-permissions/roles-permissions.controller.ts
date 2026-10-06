import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { RolesPermissionsService } from './roles-permissions.service';
import { LEGACY_FULL_AUTHORITY_ROLES } from './interfaces';
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleFilterDto,
  CreatePermissionDto,
  PermissionFilterDto,
  GrantPermissionDto,
  AssignRoleDto,
  RevokeAssignmentDto,
  AssignmentFilterDto,
  RoleResponseDto,
  PaginatedRoleResponseDto,
  PermissionResponseDto,
  PaginatedPermissionResponseDto,
  RolePermissionResponseDto,
  RoleAssignmentResponseDto,
  PaginatedRoleAssignmentResponseDto,
  RoleAssignmentHistoryResponseDto,
  RolePermissionHistoryResponseDto,
  EffectivePermissionsResponseDto,
} from './dto';

@Controller({ path: 'roles-permissions', version: '1' })
export class RolesPermissionsController {
  constructor(private readonly rolesPermissionsService: RolesPermissionsService) {}

  // ── Roles ────────────────────────────────────────────────────────

  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleResponseDto> {
    return (await this.rolesPermissionsService.createRole(workspaceId, userId, dto)) as unknown as RoleResponseDto;
  }

  @Get('roles')
  async findAllRoles(
    @WorkspaceId() workspaceId: string,
    @Query() filter: RoleFilterDto,
  ): Promise<PaginatedRoleResponseDto> {
    return this.rolesPermissionsService.findAllRoles(workspaceId, filter);
  }

  @Get('roles/:id')
  async findRole(@Param('id') id: string): Promise<RoleResponseDto> {
    return (await this.rolesPermissionsService.findRole(id)) as unknown as RoleResponseDto;
  }

  @Patch('roles/:id')
  async updateRole(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return (await this.rolesPermissionsService.updateRole(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as RoleResponseDto;
  }

  @Post('roles/:id/archive')
  async archiveRole(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<RoleResponseDto> {
    return (await this.rolesPermissionsService.archiveRole(id, workspaceId, userId)) as unknown as RoleResponseDto;
  }

  // ── Role permission grants ───────────────────────────────────────

  @Get('roles/:id/permissions')
  async listRolePermissions(@Param('id') id: string) {
    return this.rolesPermissionsService.listRolePermissions(id);
  }

  @Post('roles/:id/permissions')
  @HttpCode(HttpStatus.CREATED)
  async grantPermission(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<RolePermissionResponseDto> {
    return (await this.rolesPermissionsService.grantPermission(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as RolePermissionResponseDto;
  }

  @Delete('roles/:id/permissions/:permissionKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePermission(
    @Param('id') id: string,
    @Param('permissionKey') permissionKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.rolesPermissionsService.revokePermission(id, permissionKey, workspaceId, userId);
  }

  @Get('roles/:id/permission-history')
  async getPermissionHistory(@Param('id') id: string): Promise<RolePermissionHistoryResponseDto[]> {
    return (await this.rolesPermissionsService.getPermissionHistory(
      id,
    )) as unknown as RolePermissionHistoryResponseDto[];
  }

  // ── Permission catalog ───────────────────────────────────────────

  @Post('permissions')
  @HttpCode(HttpStatus.CREATED)
  async createPermission(
    @UserRole() userRole: string,
    @Body() dto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    return (await this.rolesPermissionsService.createPermission(
      userRole,
      dto,
    )) as unknown as PermissionResponseDto;
  }

  @Get('permissions')
  async findAllPermissions(@Query() filter: PermissionFilterDto): Promise<PaginatedPermissionResponseDto> {
    return this.rolesPermissionsService.findAllPermissions(filter);
  }

  @Get('permissions/:key')
  async findPermission(@Param('key') key: string): Promise<PermissionResponseDto> {
    return (await this.rolesPermissionsService.findPermission(key)) as unknown as PermissionResponseDto;
  }

  // ── Assignments ──────────────────────────────────────────────────

  @Post('assignments')
  @HttpCode(HttpStatus.CREATED)
  async assignRole(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: AssignRoleDto,
  ): Promise<RoleAssignmentResponseDto> {
    return (await this.rolesPermissionsService.assignRole(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as RoleAssignmentResponseDto;
  }

  @Get('assignments')
  async findAllAssignments(
    @WorkspaceId() workspaceId: string,
    @Query() filter: AssignmentFilterDto,
  ): Promise<PaginatedRoleAssignmentResponseDto> {
    return this.rolesPermissionsService.findAllAssignments(workspaceId, filter);
  }

  @Post('process-expiry')
  async processExpiry(): Promise<{ expiredCount: number }> {
    const expiredCount = await this.rolesPermissionsService.processLapsedAssignments();
    return { expiredCount };
  }

  @Get('assignments/:id')
  async findAssignment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<RoleAssignmentResponseDto> {
    return (await this.rolesPermissionsService.findAssignment(
      id,
      workspaceId,
    )) as unknown as RoleAssignmentResponseDto;
  }

  @Post('assignments/:id/revoke')
  async revokeAssignment(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RevokeAssignmentDto,
  ): Promise<RoleAssignmentResponseDto> {
    return (await this.rolesPermissionsService.revokeAssignment(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as RoleAssignmentResponseDto;
  }

  @Get('assignments/:id/history')
  async getAssignmentHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<RoleAssignmentHistoryResponseDto[]> {
    return (await this.rolesPermissionsService.getAssignmentHistory(
      id,
      workspaceId,
    )) as unknown as RoleAssignmentHistoryResponseDto[];
  }

  // ── "What can I do" convenience ──────────────────────────────────

  @Get('me/effective-permissions')
  async getMyEffectivePermissions(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<EffectivePermissionsResponseDto> {
    const permissions = await this.rolesPermissionsService.getEffectivePermissions(workspaceId, userId);
    const hasFullAccess = LEGACY_FULL_AUTHORITY_ROLES.includes(userRole);
    return { userId, workspaceId, permissions, hasFullAccess };
  }
}
