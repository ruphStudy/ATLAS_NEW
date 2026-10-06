import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsRepository } from './roles-permissions.repository';
import {
  IEffectivePermission,
  IPermissionCheckRequest,
  PermissionEffect,
  PrincipalType,
  LEGACY_FULL_AUTHORITY_ROLES,
} from './interfaces';
import { MAX_ROLE_HIERARCHY_DEPTH } from './constants';
import { PrivilegeEscalationDeniedException } from './exceptions/roles-permissions.exceptions';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface ICacheEntry {
  value: IEffectivePermission[];
  expiresAt: number;
}

/**
 * PermissionResolverService — the single, centralized place that turns role
 * assignments + role inheritance + deny overrides into an effective
 * permission set, and the single place that enforces "never grant above
 * your own authority". Any module wanting a permission check goes through
 * here (via `PermissionsGuard`) rather than re-implementing role-array
 * checks itself.
 */
@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);
  private readonly cache = new Map<string, ICacheEntry>();

  constructor(private readonly repository: RolesPermissionsRepository) {}

  // ── Effective permission resolution ─────────────────────────────

  async getEffectivePermissions(
    workspaceId: string,
    principalType: PrincipalType,
    principalId: string,
  ): Promise<IEffectivePermission[]> {
    const cacheKey = `${workspaceId}:${principalType}:${principalId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const assignments = await this.repository.findActiveAssignmentsForPrincipal(
      workspaceId,
      principalType,
      principalId,
      new Date(),
    );

    if (assignments.length === 0) {
      this.cache.set(cacheKey, { value: [], expiresAt: Date.now() + CACHE_TTL_MS });
      return [];
    }

    const chains = await Promise.all(assignments.map((a) => this.resolveInheritanceChain(a.roleId)));
    const allRoleIds = [...new Set(chains.flat())];
    const rolePermissions = await this.repository.listRolePermissionsForRoles(allRoleIds);

    const result = this.mergeChains(chains, rolePermissions);
    this.cache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  /** A role's own effective permission set through its inheritance chain — used to validate grants/assignments before they happen (no assignment involved). */
  async getRoleEffectivePermissions(roleId: string): Promise<IEffectivePermission[]> {
    const chain = await this.resolveInheritanceChain(roleId);
    const rolePermissions = await this.repository.listRolePermissionsForRoles(chain);
    return this.mergeChains([chain], rolePermissions);
  }

  invalidate(workspaceId: string, principalType: PrincipalType, principalId: string): void {
    this.cache.delete(`${workspaceId}:${principalType}:${principalId}`);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  // ── The guard-facing check ───────────────────────────────────────

  async hasPermission(request: IPermissionCheckRequest): Promise<boolean> {
    if (LEGACY_FULL_AUTHORITY_ROLES.includes(request.legacyRole)) {
      return true;
    }

    const permission = await this.repository.findPermissionByModuleResourceAction(
      request.module,
      request.resource,
      request.action,
      request.scopeType,
    );
    if (!permission) {
      return false;
    }

    const effective = await this.getEffectivePermissions(request.workspaceId, PrincipalType.USER, request.userId);
    const match = effective.find((p) => p.key === permission.key);
    return match?.effect === PermissionEffect.ALLOW;
  }

  // ── Privilege-escalation guard ───────────────────────────────────

  /** Throws unless the acting principal already holds (via their own effective set) every permission they are about to grant/assign. Legacy OWNER/ADMIN bypass, preserving existing unrestricted access. */
  assertNotEscalating(
    actingEffectivePermissions: IEffectivePermission[],
    legacyRole: string,
    targetPermissionKey: string,
    targetEffect: PermissionEffect,
  ): void {
    if (LEGACY_FULL_AUTHORITY_ROLES.includes(legacyRole)) {
      return;
    }
    if (targetEffect === PermissionEffect.DENY) {
      // Narrowing someone's access is never an escalation of the acting user's own authority.
      return;
    }
    const held = actingEffectivePermissions.find((p) => p.key === targetPermissionKey);
    if (!held || held.effect !== PermissionEffect.ALLOW) {
      throw new PrivilegeEscalationDeniedException();
    }
  }

  /** Same guarantee, applied to an entire role's permission set (e.g. before assigning that role to someone else). */
  assertCanGrantRole(
    actingEffectivePermissions: IEffectivePermission[],
    legacyRole: string,
    targetRolePermissions: IEffectivePermission[],
  ): void {
    if (LEGACY_FULL_AUTHORITY_ROLES.includes(legacyRole)) {
      return;
    }
    for (const permission of targetRolePermissions) {
      if (permission.effect !== PermissionEffect.ALLOW) {
        continue;
      }
      this.assertNotEscalating(actingEffectivePermissions, legacyRole, permission.key, permission.effect);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────

  /** Ordered closest-role-first, cycle-safe, depth-bounded. */
  async resolveInheritanceChain(roleId: string): Promise<string[]> {
    const chain: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null | undefined = roleId;

    while (currentId && !visited.has(currentId) && chain.length < MAX_ROLE_HIERARCHY_DEPTH) {
      visited.add(currentId);
      chain.push(currentId);
      const role = await this.repository.findRoleById(currentId);
      currentId = role?.parentRoleId ?? null;
    }

    return chain;
  }

  private mergeChains(
    chains: string[][],
    rolePermissions: Array<{ roleId: string; permissionKey: string; effect: PermissionEffect }>,
  ): IEffectivePermission[] {
    const effectiveMap = new Map<string, IEffectivePermission>();
    const denyKeys = new Set<string>();

    for (const chain of chains) {
      // Furthest ancestor first, so the closer (more specific) role's grant overrides it for the same key.
      for (let i = chain.length - 1; i >= 0; i--) {
        const roleId = chain[i];
        for (const row of rolePermissions.filter((rp) => rp.roleId === roleId)) {
          effectiveMap.set(row.permissionKey, { key: row.permissionKey, effect: row.effect, sourceRoleId: roleId });
          if (row.effect === PermissionEffect.DENY) {
            denyKeys.add(row.permissionKey);
          }
        }
      }
    }

    // Deny overrides — if ANY assignment/role in the chain set denies a key, it stays denied regardless of
    // another chain's ALLOW (evaluated last so it always wins the final map state).
    for (const key of denyKeys) {
      const existing = effectiveMap.get(key);
      effectiveMap.set(key, { key, effect: PermissionEffect.DENY, sourceRoleId: existing?.sourceRoleId ?? '' });
    }

    return [...effectiveMap.values()];
  }
}
