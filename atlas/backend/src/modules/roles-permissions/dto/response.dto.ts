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
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  type: RoleType;
  parentRoleId?: string | null;
  isSystem: boolean;
  status: RoleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedRoleResponseDto {
  data: RoleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PermissionResponseDto {
  id: string;
  key: string;
  module: string;
  resource: string;
  action: PermissionAction;
  scope: PermissionScope;
  description?: string | null;
  createdAt: Date;
}

export class PaginatedPermissionResponseDto {
  data: PermissionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RolePermissionResponseDto {
  id: string;
  roleId: string;
  permissionId: string;
  effect: PermissionEffect;
  constraints?: unknown;
  createdAt: Date;
}

export class RoleAssignmentResponseDto {
  id: string;
  workspaceId: string;
  roleId: string;
  principalType: PrincipalType;
  principalId: string;
  scopeType: AssignmentScopeType;
  scopeId?: string | null;
  status: AssignmentStatus;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  assignedBy?: string | null;
  revokedBy?: string | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedRoleAssignmentResponseDto {
  data: RoleAssignmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RoleAssignmentHistoryResponseDto {
  id: string;
  assignmentId: string;
  fromStatus?: AssignmentStatus | null;
  toStatus: AssignmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class RolePermissionHistoryResponseDto {
  id: string;
  roleId: string;
  permissionKey: string;
  action: string;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class EffectivePermissionsResponseDto {
  userId: string;
  workspaceId: string;
  permissions: Array<{ key: string; effect: PermissionEffect; sourceRoleId: string }>;
}
