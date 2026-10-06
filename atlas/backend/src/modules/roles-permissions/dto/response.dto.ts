import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoleType,
  RoleStatus,
  PermissionAction,
  PermissionScope,
  PermissionEffect,
  PrincipalType,
  AssignmentScopeType,
  AssignmentStatus,
} from '../interfaces';

export class RoleResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key!: string;
  name!: string;
  description?: string | null;
  type!: RoleType;
  parentRoleId?: string | null;
  isSystem!: boolean;
  status!: RoleStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedRoleResponseDto {
  data!: RoleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PermissionResponseDto {
  id!: string;
  key!: string;
  module!: string;
  resource!: string;
  action!: PermissionAction;
  scope!: PermissionScope;
  description?: string | null;
  createdAt!: Date;
}

export class PaginatedPermissionResponseDto {
  data!: PermissionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class RolePermissionResponseDto {
  id!: string;
  roleId!: string;
  permissionId!: string;
  effect!: PermissionEffect;
  constraints?: unknown;
  createdAt!: Date;
}

export class RoleAssignmentResponseDto {
  id!: string;
  workspaceId!: string;
  roleId!: string;
  principalType!: PrincipalType;
  principalId!: string;
  scopeType!: AssignmentScopeType;
  scopeId?: string | null;
  status!: AssignmentStatus;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  assignedBy?: string | null;
  revokedBy?: string | null;
  revokedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedRoleAssignmentResponseDto {
  data!: RoleAssignmentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class RoleAssignmentHistoryResponseDto {
  id!: string;
  assignmentId!: string;
  @ApiPropertyOptional({ enum: AssignmentStatus, nullable: true })
  fromStatus?: AssignmentStatus | null;
  toStatus!: AssignmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class RolePermissionHistoryResponseDto {
  id!: string;
  roleId!: string;
  permissionKey!: string;
  action!: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class EffectivePermissionsResponseDto {
  userId!: string;
  workspaceId!: string;
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        effect: { type: 'string', enum: Object.values(PermissionEffect) },
        sourceRoleId: { type: 'string' },
      },
    },
  })
  permissions!: Array<{ key: string; effect: PermissionEffect; sourceRoleId: string }>;

  @ApiProperty({
    example: false,
    description:
      'True for legacy full-authority roles (OWNER, ADMIN — see LEGACY_FULL_AUTHORITY_ROLES), which bypass the granular assignment/permission-catalog system everywhere else in this module (see PermissionResolverService.hasPermission). Surfaced here so UIs can grant the same bypass to module-visibility checks instead of relying on `permissions` alone, which reflects only explicit role assignments. Never true for Platform Administration access, which is governed exclusively by the separate `isPlatformAdmin` flag.',
  })
  hasFullAccess!: boolean;
}
