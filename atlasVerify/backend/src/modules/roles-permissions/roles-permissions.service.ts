import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { RolesPermissionsRepository } from './roles-permissions.repository';
import { PermissionResolverService } from './permission-resolver.service';
import { RolesPermissionsEventQueue } from './jobs';
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
  PaginatedRoleResponseDto,
  PaginatedPermissionResponseDto,
  PaginatedRoleAssignmentResponseDto,
} from './dto';
import {
  IRole,
  IPermission,
  IRolePermission,
  IRoleAssignment,
  IRoleAssignmentHistory,
  IRolePermissionHistory,
  IEffectivePermission,
  RoleType,
  RoleStatus,
  PermissionEffect,
  PrincipalType,
  AssignmentStatus,
  AssignmentScopeType,
  RolesPermissionsEvent,
  LEGACY_FULL_AUTHORITY_ROLES,
} from './interfaces';
import {
  SYSTEM_ROLE_SEEDS,
  FOUNDATIONAL_PERMISSION_SEEDS,
  SYSTEM_ROLE_DEFAULT_GRANTS,
  SYSTEM_ROLE_SCOPE_KEY,
  ROLES_PERMISSIONS_MODULE,
  ROLE_ASSIGNMENT_ALLOWED_TRANSITIONS,
} from './constants';
import {
  RoleNotFoundException,
  RoleAlreadyExistsException,
  RoleIsSystemRoleException,
  RoleInvalidHierarchyException,
  RoleInUseException,
  PermissionNotFoundException,
  PermissionAlreadyExistsException,
  PermissionDeniedException,
  RoleAssignmentNotFoundException,
  RoleAssignmentAlreadyExistsException,
  RoleAssignmentInvalidStateTransitionException,
  RoleAssignmentInvalidScopeException,
} from './exceptions/roles-permissions.exceptions';

@Injectable()
export class RolesPermissionsService implements OnModuleInit {
  private readonly logger = new Logger(RolesPermissionsService.name);

  constructor(
    private readonly repository: RolesPermissionsRepository,
    private readonly permissionResolver: PermissionResolverService,
    private readonly eventQueue: RolesPermissionsEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const seed of SYSTEM_ROLE_SEEDS) {
      const existing = await this.repository.findRoleByScopeKeyAndKey(SYSTEM_ROLE_SCOPE_KEY, seed.key);
      if (!existing) {
        await this.repository.createRole({
          workspaceId: null,
          organizationId: null,
          scopeKey: SYSTEM_ROLE_SCOPE_KEY,
          key: seed.key,
          name: seed.name,
          type: RoleType.SYSTEM,
          isSystem: true,
          status: RoleStatus.ACTIVE,
        });
      }
    }

    for (const seed of FOUNDATIONAL_PERMISSION_SEEDS) {
      const existing = await this.repository.findPermissionByKey(seed.key);
      if (!existing) {
        await this.repository.createPermission({
          key: seed.key,
          module: ROLES_PERMISSIONS_MODULE,
          resource: seed.resource,
          action: seed.action,
          scope: seed.scope,
          description: seed.description,
        });
      }
    }

    for (const [roleKey, permissionKeys] of Object.entries(SYSTEM_ROLE_DEFAULT_GRANTS)) {
      const role = await this.repository.findRoleByScopeKeyAndKey(SYSTEM_ROLE_SCOPE_KEY, roleKey);
      if (!role) {
        continue;
      }
      for (const permissionKey of permissionKeys) {
        const permission = await this.repository.findPermissionByKey(permissionKey);
        if (!permission) {
          continue;
        }
        const existing = await this.repository.findRolePermission(role.id, permission.id);
        if (!existing) {
          await this.repository.createRolePermission({
            roleId: role.id,
            permissionId: permission.id,
            effect: PermissionEffect.ALLOW,
          });
        }
      }
    }
  }

  // ── Roles ────────────────────────────────────────────────────────

  async createRole(workspaceId: string, userId: string, dto: CreateRoleDto): Promise<IRole> {
    if (dto.type === RoleType.SYSTEM) {
      throw new RoleInvalidHierarchyException('SYSTEM roles cannot be created via the API');
    }

    const scopeKey =
      dto.type === RoleType.ORGANIZATION && dto.organizationId
        ? `ORG:${dto.organizationId}`
        : `WORKSPACE:${workspaceId}`;

    const existing = await this.repository.findRoleByScopeKeyAndKey(scopeKey, dto.key);
    if (existing) {
      throw new RoleAlreadyExistsException(dto.key);
    }

    if (dto.parentRoleId) {
      await this.getRoleOrThrow(dto.parentRoleId);
    }

    const role = await this.repository.createRole({
      workspaceId: dto.type === RoleType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.type === RoleType.ORGANIZATION ? dto.organizationId : null,
      scopeKey,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      parentRoleId: dto.parentRoleId,
      isSystem: false,
      status: RoleStatus.ACTIVE,
    });

    await this.recordAudit(workspaceId, userId, 'role.created', 'Role', role.id);
    await this.publishEvent(RolesPermissionsEvent.ROLE_CREATED, { workspaceId, roleId: role.id, actorId: userId });
    return role;
  }

  async updateRole(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: UpdateRoleDto,
  ): Promise<IRole> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new RoleIsSystemRoleException(role.key);
    }

    if (dto.parentRoleId !== undefined && dto.parentRoleId !== null) {
      if (dto.parentRoleId === id) {
        throw new RoleInvalidHierarchyException('a role cannot be its own parent');
      }

      const proposedParent = await this.getRoleOrThrow(dto.parentRoleId);
      const ancestorChain = await this.permissionResolver.resolveInheritanceChain(proposedParent.id);
      if (ancestorChain.includes(id)) {
        throw new RoleInvalidHierarchyException('this parent is a descendant of the role — would create a cycle');
      }

      const actingEffective = await this.permissionResolver.getEffectivePermissions(
        workspaceId,
        PrincipalType.USER,
        userId,
      );
      const newParentPermissions = await this.permissionResolver.getRoleEffectivePermissions(proposedParent.id);
      this.permissionResolver.assertCanGrantRole(actingEffective, userRole, newParentPermissions);
    }

    const updated = await this.repository.updateRole(id, {
      name: dto.name,
      description: dto.description,
      parentRoleId: dto.parentRoleId,
    } as Partial<IRole>);

    this.permissionResolver.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'role.updated', 'Role', role.id);
    await this.publishEvent(RolesPermissionsEvent.ROLE_UPDATED, { workspaceId, roleId: role.id, actorId: userId });
    return updated;
  }

  async archiveRole(id: string, workspaceId: string, userId: string): Promise<IRole> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new RoleIsSystemRoleException(role.key);
    }

    const activeAssignments = await this.repository.countActiveAssignmentsForRole(id);
    if (activeAssignments > 0) {
      throw new RoleInUseException(role.key);
    }

    const updated = await this.repository.updateRole(id, { status: RoleStatus.ARCHIVED } as Partial<IRole>);

    this.permissionResolver.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'role.archived', 'Role', role.id);
    await this.publishEvent(RolesPermissionsEvent.ROLE_ARCHIVED, { workspaceId, roleId: role.id, actorId: userId });
    return updated;
  }

  async findRole(id: string): Promise<IRole> {
    return this.getRoleOrThrow(id);
  }

  async findAllRoles(workspaceId: string, filter: RoleFilterDto): Promise<PaginatedRoleResponseDto> {
    const visibleScopeKeys = [SYSTEM_ROLE_SCOPE_KEY, `WORKSPACE:${workspaceId}`];
    const [data, total] = await this.repository.findAllRoles(visibleScopeKeys, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Permission catalog ───────────────────────────────────────────

  async createPermission(userRole: string, dto: CreatePermissionDto): Promise<IPermission> {
    if (!LEGACY_FULL_AUTHORITY_ROLES.includes(userRole)) {
      throw new PermissionDeniedException('define', 'permission catalog entries');
    }

    const existingByKey = await this.repository.findPermissionByKey(dto.key);
    if (existingByKey) {
      throw new PermissionAlreadyExistsException(dto.key);
    }

    const existingByTuple = await this.repository.findPermissionByModuleResourceAction(
      dto.module,
      dto.resource,
      dto.action,
      dto.scope,
    );
    if (existingByTuple) {
      throw new PermissionAlreadyExistsException(existingByTuple.key);
    }

    return this.repository.createPermission({
      key: dto.key,
      module: dto.module,
      resource: dto.resource,
      action: dto.action,
      scope: dto.scope,
      description: dto.description,
    });
  }

  async findPermission(key: string): Promise<IPermission> {
    return this.getPermissionOrThrow(key);
  }

  async findAllPermissions(filter: PermissionFilterDto): Promise<PaginatedPermissionResponseDto> {
    const [data, total] = await this.repository.findAllPermissions(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Role permission grants (deny overrides supported via `effect`) ──

  async grantPermission(
    roleId: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: GrantPermissionDto,
  ): Promise<IRolePermission> {
    const role = await this.getRoleOrThrow(roleId);
    if (role.isSystem) {
      throw new RoleIsSystemRoleException(role.key);
    }

    const permission = await this.getPermissionOrThrow(dto.permissionKey);
    const effect = dto.effect ?? PermissionEffect.ALLOW;

    const actingEffective = await this.permissionResolver.getEffectivePermissions(
      workspaceId,
      PrincipalType.USER,
      userId,
    );
    this.permissionResolver.assertNotEscalating(actingEffective, userRole, permission.key, effect);

    const existing = await this.repository.findRolePermission(role.id, permission.id);
    const rolePermission = existing
      ? await this.repository.updateRolePermission(existing.id, { effect, constraints: dto.constraints })
      : await this.repository.createRolePermission({
          roleId: role.id,
          permissionId: permission.id,
          effect,
          constraints: dto.constraints,
          createdBy: userId,
        });

    await this.repository.createPermissionHistory({
      roleId: role.id,
      permissionKey: permission.key,
      action: effect === PermissionEffect.ALLOW ? 'GRANTED' : 'DENIED',
      changedBy: userId,
    });

    this.permissionResolver.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'role.permission.granted', 'Role', role.id, undefined, {
      permissionKey: permission.key,
      effect,
    });
    await this.publishEvent(
      effect === PermissionEffect.ALLOW
        ? RolesPermissionsEvent.PERMISSION_GRANTED
        : RolesPermissionsEvent.PERMISSION_DENIED_GRANT,
      { workspaceId, roleId: role.id, permissionKey: permission.key, actorId: userId },
    );
    return rolePermission;
  }

  async revokePermission(
    roleId: string,
    permissionKey: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const role = await this.getRoleOrThrow(roleId);
    if (role.isSystem) {
      throw new RoleIsSystemRoleException(role.key);
    }

    const permission = await this.getPermissionOrThrow(permissionKey);
    const existing = await this.repository.findRolePermission(role.id, permission.id);
    if (!existing) {
      throw new PermissionNotFoundException(permissionKey);
    }

    await this.repository.deleteRolePermission(existing.id);
    await this.repository.createPermissionHistory({
      roleId: role.id,
      permissionKey: permission.key,
      action: 'REVOKED',
      changedBy: userId,
    });

    this.permissionResolver.invalidateAll();
    await this.recordAudit(workspaceId, userId, 'role.permission.revoked', 'Role', role.id, undefined, {
      permissionKey: permission.key,
    });
    await this.publishEvent(RolesPermissionsEvent.PERMISSION_REVOKED, {
      workspaceId,
      roleId: role.id,
      permissionKey: permission.key,
      actorId: userId,
    });
  }

  async listRolePermissions(roleId: string): Promise<Array<{ permissionKey: string; effect: PermissionEffect }>> {
    await this.getRoleOrThrow(roleId);
    const rows = await this.repository.listRolePermissionsForRoles([roleId]);
    return rows.map((r) => ({ permissionKey: r.permissionKey, effect: r.effect }));
  }

  async getPermissionHistory(roleId: string): Promise<IRolePermissionHistory[]> {
    await this.getRoleOrThrow(roleId);
    return this.repository.findPermissionHistory(roleId);
  }

  // ── Role assignments ─────────────────────────────────────────────

  async assignRole(
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: AssignRoleDto,
  ): Promise<IRoleAssignment> {
    const role = await this.getRoleOrThrow(dto.roleId);
    if (role.workspaceId && role.workspaceId !== workspaceId) {
      throw new RoleNotFoundException(dto.roleId);
    }

    const scopeType = dto.scopeType ?? AssignmentScopeType.WORKSPACE;
    const scopedTiers = [AssignmentScopeType.MARKETPLACE, AssignmentScopeType.WAREHOUSE, AssignmentScopeType.ENTITY];
    if (scopedTiers.includes(scopeType) && !dto.scopeId) {
      throw new RoleAssignmentInvalidScopeException(scopeType);
    }

    const actingEffective = await this.permissionResolver.getEffectivePermissions(
      workspaceId,
      PrincipalType.USER,
      userId,
    );
    const targetRolePermissions = await this.permissionResolver.getRoleEffectivePermissions(role.id);
    this.permissionResolver.assertCanGrantRole(actingEffective, userRole, targetRolePermissions);

    const existing = await this.repository.findExistingActiveAssignment(
      workspaceId,
      role.id,
      dto.principalType,
      dto.principalId,
      scopeType,
      dto.scopeId,
    );
    if (existing) {
      throw new RoleAssignmentAlreadyExistsException();
    }

    const assignment = await this.repository.createAssignment({
      workspaceId,
      roleId: role.id,
      principalType: dto.principalType,
      principalId: dto.principalId,
      scopeType,
      scopeId: dto.scopeId,
      status: AssignmentStatus.ACTIVE,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      assignedBy: userId,
    });

    await this.repository.createAssignmentHistory({
      assignmentId: assignment.id,
      workspaceId,
      toStatus: AssignmentStatus.ACTIVE,
      reason: dto.reason ?? 'Assigned',
      changedBy: userId,
    });

    this.permissionResolver.invalidate(workspaceId, dto.principalType, dto.principalId);
    await this.recordAudit(workspaceId, userId, 'role.assigned', 'RoleAssignment', assignment.id, undefined, {
      roleKey: role.key,
      principalType: dto.principalType,
      principalId: dto.principalId,
    });
    await this.publishEvent(RolesPermissionsEvent.ASSIGNMENT_CREATED, {
      workspaceId,
      roleId: role.id,
      assignmentId: assignment.id,
      actorId: userId,
    });
    return assignment;
  }

  async revokeAssignment(
    id: string,
    workspaceId: string,
    userId: string,
    dto: RevokeAssignmentDto,
  ): Promise<IRoleAssignment> {
    const assignment = await this.getAssignmentOrThrow(id, workspaceId);
    if (!ROLE_ASSIGNMENT_ALLOWED_TRANSITIONS[assignment.status]?.includes(AssignmentStatus.REVOKED)) {
      throw new RoleAssignmentInvalidStateTransitionException(assignment.status, AssignmentStatus.REVOKED);
    }

    const updated = await this.repository.updateAssignment(id, {
      status: AssignmentStatus.REVOKED,
      revokedBy: userId,
      revokedAt: new Date(),
    } as Partial<IRoleAssignment>);

    await this.repository.createAssignmentHistory({
      assignmentId: id,
      workspaceId,
      fromStatus: assignment.status,
      toStatus: AssignmentStatus.REVOKED,
      reason: dto.reason ?? 'Revoked',
      changedBy: userId,
    });

    this.permissionResolver.invalidate(workspaceId, assignment.principalType, assignment.principalId);
    await this.recordAudit(workspaceId, userId, 'role.assignment.revoked', 'RoleAssignment', assignment.id);
    await this.publishEvent(RolesPermissionsEvent.ASSIGNMENT_REVOKED, {
      workspaceId,
      roleId: assignment.roleId,
      assignmentId: assignment.id,
      actorId: userId,
    });
    return updated;
  }

  async findAssignment(id: string, workspaceId: string): Promise<IRoleAssignment> {
    return this.getAssignmentOrThrow(id, workspaceId);
  }

  async findAllAssignments(
    workspaceId: string,
    filter: AssignmentFilterDto,
  ): Promise<PaginatedRoleAssignmentResponseDto> {
    const [data, total] = await this.repository.findAllAssignments(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAssignmentHistory(id: string, workspaceId: string): Promise<IRoleAssignmentHistory[]> {
    await this.getAssignmentOrThrow(id, workspaceId);
    return this.repository.findAssignmentHistory(id);
  }

  // ── "What can I do" convenience ──────────────────────────────────

  async getEffectivePermissions(workspaceId: string, userId: string): Promise<IEffectivePermission[]> {
    return this.permissionResolver.getEffectivePermissions(workspaceId, PrincipalType.USER, userId);
  }

  /** Does this user currently hold an active assignment (in this workspace) to a role with this key? Used by other modules (e.g. Approval Workflow) needing role-based eligibility without re-implementing role-membership lookups. */
  async userHasActiveRole(workspaceId: string, userId: string, roleKey: string): Promise<boolean> {
    const assignments = await this.repository.findActiveAssignmentsForPrincipal(
      workspaceId,
      PrincipalType.USER,
      userId,
      new Date(),
    );
    if (assignments.length === 0) {
      return false;
    }
    const roleIds = [...new Set(assignments.map((a) => a.roleId))];
    const roles = await this.repository.findRolesByIds(roleIds);
    return roles.some((r) => r.key.toLowerCase() === roleKey.toLowerCase());
  }

  // ── Expiry (scheduler-callable; no active scheduler wired — mirrors Document Management's approach) ──

  async processLapsedAssignments(): Promise<number> {
    const now = new Date();
    const lapsed = await this.repository.findLapsedActiveAssignments(now);

    for (const assignment of lapsed) {
      await this.repository.updateAssignment(assignment.id, { status: AssignmentStatus.EXPIRED } as Partial<IRoleAssignment>);
      await this.repository.createAssignmentHistory({
        assignmentId: assignment.id,
        workspaceId: assignment.workspaceId,
        fromStatus: assignment.status,
        toStatus: AssignmentStatus.EXPIRED,
        reason: 'Effective window elapsed',
      });
      this.permissionResolver.invalidate(assignment.workspaceId, assignment.principalType, assignment.principalId);
      await this.publishEvent(RolesPermissionsEvent.ASSIGNMENT_EXPIRED, {
        workspaceId: assignment.workspaceId,
        roleId: assignment.roleId,
        assignmentId: assignment.id,
      });
    }

    return lapsed.length;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getRoleOrThrow(id: string): Promise<IRole> {
    const role = await this.repository.findRoleById(id);
    if (!role) {
      throw new RoleNotFoundException(id);
    }
    return role;
  }

  private async getPermissionOrThrow(key: string): Promise<IPermission> {
    const permission = await this.repository.findPermissionByKey(key);
    if (!permission) {
      throw new PermissionNotFoundException(key);
    }
    return permission;
  }

  private async getAssignmentOrThrow(id: string, workspaceId: string): Promise<IRoleAssignment> {
    const assignment = await this.repository.findAssignmentById(id);
    if (!assignment || assignment.workspaceId !== workspaceId) {
      throw new RoleAssignmentNotFoundException(id);
    }
    return assignment;
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    outcome: ActivityOutcome = ActivityOutcome.SUCCESS,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory: AuditActionCategory.PERMISSION,
      module: ROLES_PERMISSIONS_MODULE,
      entityType,
      entityId,
      outcome,
      metadata,
    });
  }

  private async publishEvent(
    event: RolesPermissionsEvent,
    opts: {
      workspaceId?: string;
      roleId?: string;
      assignmentId?: string;
      permissionKey?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
