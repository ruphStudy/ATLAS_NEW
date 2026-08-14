import { Injectable } from '@nestjs/common';
import { IComplianceRequirementRule } from '../interfaces';
import { COMPLIANCE_CACHE_MAX_ENTRIES, COMPLIANCE_CACHE_TTL_MS } from '../constants';

interface CachedActiveRules {
  rules: IComplianceRequirementRule[];
  cachedAt: number;
}

/**
 * ComplianceFrameworkCache
 *
 * Caches the set of ACTIVE compliance rules per workspace (plus a
 * 'global' bucket for workspaceId = null defaults), so the resolver
 * doesn't re-query Postgres on every `validateAction()` call. Invalidated
 * explicitly whenever a rule is created, updated, activated or archived.
 */
@Injectable()
export class ComplianceFrameworkCache {
  private readonly activeRules = new Map<string, CachedActiveRules>();

  private static key(workspaceId?: string | null): string {
    return workspaceId ?? 'global';
  }

  getActiveRules(workspaceId?: string | null): IComplianceRequirementRule[] | null {
    const entry = this.activeRules.get(ComplianceFrameworkCache.key(workspaceId));
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > COMPLIANCE_CACHE_TTL_MS) {
      this.activeRules.delete(ComplianceFrameworkCache.key(workspaceId));
      return null;
    }
    return entry.rules;
  }

  setActiveRules(workspaceId: string | null | undefined, rules: IComplianceRequirementRule[]): void {
    this.evictIfFull();
    this.activeRules.set(ComplianceFrameworkCache.key(workspaceId), { rules, cachedAt: Date.now() });
  }

  invalidate(workspaceId?: string | null): void {
    if (workspaceId === undefined) {
      this.activeRules.clear();
      return;
    }
    this.activeRules.delete(ComplianceFrameworkCache.key(workspaceId));
    this.activeRules.delete(ComplianceFrameworkCache.key(null));
  }

  flush(): void {
    this.activeRules.clear();
  }

  get size(): number {
    return this.activeRules.size;
  }

  private evictIfFull(): void {
    if (this.activeRules.size < COMPLIANCE_CACHE_MAX_ENTRIES) return;
    const entries = [...this.activeRules.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(COMPLIANCE_CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      this.activeRules.delete(entries[i][0]);
    }
  }
}
