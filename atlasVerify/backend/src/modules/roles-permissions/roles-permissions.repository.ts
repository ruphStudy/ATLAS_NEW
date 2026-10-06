import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IRole,
  IPermission,
  IRolePermission,
  IRoleAssignment,
  IRoleAssignmentHistory,
  IRolePermissionHistory,
  AssignmentStatus,
} from './interfaces';
import { RoleFilterDto, PermissionFilterDto, AssignmentFilterDto } from './dto';

@Injectable()
export class RolesPermissionsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Roles ────────────────────────────────────────────────────────

  async createRole(data: Partial<IRole>): Promise<IRole> {
    return this.prisma.role.create({ data: data as any }) as Promise<IRole>;
  }

  async findRoleById(id: string): Promise<IRole | null> {
    return this.prisma.role.findFirst({ where: { id, deletedAt: null } }) as Promise<IRole | null>;
  }

  async findRoleByScopeKeyAndKey(scopeKey: string, key: string): Promise<IRole | null> {
    return this.prisma.role.findFirst({
      where: { scopeKey, key, deletedAt: null },
    }) as Promise<IRole | null>;
  }

  async findRolesByIds(ids: string[]): Promise<IRole[]> {
    return this.prisma.role.findMany({ where: { id: { in: ids }, deletedAt: null } }) as Promise<IRole[]>;
  }

  async findAllRoles(
    visibleScopeKeys: string[],
    filter: RoleFilterDto,
  ): Promise<[IRole[], number]> {
    const where: Record<string, unknown> = { scopeKey: { in: visibleScopeKeys }, deletedAt: null };
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.role.count({ where: where as any }),
    ]);

    return [data as IRole[], total];
  }

  async updateRole(id: string, data: Partial<IRole>): Promise<IRole> {
    return this.prisma.role.update({ where: { id }, data: data as any }) as Promise<IRole>;
  }

  async countActiveAssignmentsForRole(roleId: string): Promise<number> {
    return this.prisma.roleAssignment.count({ where: { roleId, status: AssignmentStatus.ACTIVE } });
  }

  // ── Permissions ──────────────────────────────────────────────────

  async createPermission(data: Partial<IPermission>): Promise<IPermission> {
    return this.prisma.permission.create({ data: data as any }) as Promise<IPermission>;
  }

  async findPermissionByKey(key: string): Promise<IPermission | null> {
    return this.prisma.permission.findUnique({ where: { key } }) as Promise<IPermission | null>;
  }

  async findPermissionByModuleResourceAction(
    module: string,
    resource: string,
    action: string,
    scope?: string,
  ): Promise<IPermission | null> {
    return this.prisma.permission.findFirst({
      where: { module, resource, action: action as any, scope: scope as any },
    }) as Promise<IPermission | null>;
  }

  async findAllPermissions(filter: PermissionFilterDto): Promise<[IPermission[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.module) where.module = filter.module;
    if (filter.resource) where.resource = filter.resource;
    if (filter.action) where.action = filter.action;
    if (filter.scope) where.scope = filter.scope;
    if (filter.search) {
      where.OR = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({ where: where as any, skip, take: limit, orderBy: { key: 'asc' } }),
      this.prisma.permission.count({ where: where as any }),
    ]);

    return [data as IPermission[], total];
  }

  // ── Role permissions ─────────────────────────────────────────────

  async createRolePermission(data: Partial<IRolePermission>): Promise<IRolePermission> {
    return this.prisma.rolePermission.create({ data: data as any }) as Promise<IRolePermission>;
  }

  async findRolePermission(roleId: string, permissionId: string): Promise<IRolePermission | null> {
    return this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    }) as Promise<IRolePermission | null>;
  }

  async updateRolePermission(id: string, data: Partial<IRolePermission>): Promise<IRolePermission> {
    return this.prisma.rolePermission.update({
      where: { id },
      data: data as any,
    }) as Promise<IRolePermission>;
  }

  async deleteRolePermission(id: string): Promise<void> {
    await this.prisma.rolePermission.delete({ where: { id } });
  }

  /** Role permissions for a set of roles, joined with the permission's key — used to resolve the effective permission set across an inheritance chain. */
  async listRolePermissionsForRoles(
    roleIds: string[],
  ): Promise<Array<IRolePermission & { permissionKey: string }>> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: { select: { key: true } } },
    });
    return rows.map((row: any) => ({ ...row, permissionKey: row.permission.key }));
  }

  // ── Role assignments ─────────────────────────────────────────────

  async createAssignment(data: Partial<IRoleAssignment>): Promise<IRoleAssignment> {
    return this.prisma.roleAssignment.create({ data: data as any }) as Promise<IRoleAssignment>;
  }

  async findAssignmentById(id: string): Promise<IRoleAssignment | null> {
    return this.prisma.roleAssignment.findUnique({ where: { id } }) as Promise<IRoleAssignment | null>;
  }

  async updateAssignment(id: string, data: Partial<IRoleAssignment>): Promise<IRoleAssignment> {
    return this.prisma.roleAssignment.update({ where: { id }, data: data as any }) as Promise<IRoleAssignment>;
  }

  async findExistingActiveAssignment(
    workspaceId: string,
    roleId: string,
    principalType: string,
    principalId: string,
    scopeType: string,
    scopeId: string | undefined,
  ): Promise<IRoleAssignment | null> {
    return this.prisma.roleAssignment.findFirst({
      where: {
        workspaceId,
        roleId,
        principalType: principalType as any,
        principalId,
        scopeType: scopeType as any,
        scopeId: scopeId ?? null,
        status: AssignmentStatus.ACTIVE,
      },
    }) as Promise<IRoleAssignment | null>;
  }

  /** Every currently-effective ACTIVE assignment for a principal in a workspace — the core input to permission resolution. */
  async findActiveAssignmentsForPrincipal(
    workspaceId: string,
    principalType: string,
    principalId: string,
    now: Date,
  ): Promise<IRoleAssignment[]> {
    return this.prisma.roleAssignment.findMany({
      where: {
        workspaceId,
        principalType: principalType as any,
        principalId,
        status: AssignmentStatus.ACTIVE,
        AND: [
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
        ],
      },
    }) as Promise<IRoleAssignment[]>;
  }

  async findAllAssignments(
    workspaceId: string,
    filter: AssignmentFilterDto,
  ): Promise<[IRoleAssignment[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.roleId) where.roleId = filter.roleId;
    if (filter.principalType) where.principalType = filter.principalType;
    if (filter.principalId) where.principalId = filter.principalId;
    if (filter.status) where.status = filter.status;
    if (filter.scopeType) where.scopeType = filter.scopeType;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.roleAssignment.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.roleAssignment.count({ where: where as any }),
    ]);

    return [data as IRoleAssignment[], total];
  }

  /** Bounded scan of ACTIVE assignments past their `effectiveTo` — used to lazily flip them to EXPIRED on resolution/listing. */
  async findLapsedActiveAssignments(now: Date, limit = 500): Promise<IRoleAssignment[]> {
    return this.prisma.roleAssignment.findMany({
      where: { status: AssignmentStatus.ACTIVE, effectiveTo: { lt: now } },
      take: limit,
    }) as Promise<IRoleAssignment[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createAssignmentHistory(data: Partial<IRoleAssignmentHistory>): Promise<IRoleAssignmentHistory> {
    return this.prisma.roleAssignmentHistory.create({ data: data as any }) as Promise<IRoleAssignmentHistory>;
  }

  async findAssignmentHistory(assignmentId: string): Promise<IRoleAssignmentHistory[]> {
    return this.prisma.roleAssignmentHistory.findMany({
      where: { assignmentId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IRoleAssignmentHistory[]>;
  }

  async createPermissionHistory(data: Partial<IRolePermissionHistory>): Promise<IRolePermissionHistory> {
    return this.prisma.rolePermissionHistory.create({
      data: data as any,
    }) as Promise<IRolePermissionHistory>;
  }

  async findPermissionHistory(roleId: string): Promise<IRolePermissionHistory[]> {
    return this.prisma.rolePermissionHistory.findMany({
      where: { roleId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IRolePermissionHistory[]>;
  }
}
