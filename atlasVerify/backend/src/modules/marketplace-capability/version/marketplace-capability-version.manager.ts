import { Injectable } from '@nestjs/common';
import {
  CapabilityDependency,
  DependencyResolutionResult,
  IMarketplaceCapabilityDefinition,
} from '../interfaces';
import { MP_CAPABILITY_CONSTANTS } from '../constants';

@Injectable()
export class MarketplaceCapabilityVersionManager {
  // ── Version Format ─────────────────────────────────────────

  /**
   * Increments the patch segment of a semver string.
   */
  increment(version: string): string {
    const [maj, min, patch] = version.replace(/^v/, '').split('.').map(Number);
    return `${maj ?? 1}.${min ?? 0}.${(patch ?? 0) + 1}`;
  }

  /**
   * Returns true if `candidate` satisfies `required` (>= required).
   */
  satisfies(candidate: string, required: string): boolean {
    const parse = (v: string): [number, number, number] => {
      const parts = v.replace(/^v/, '').split('.').map(Number);
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    };
    const [cMaj, cMin, cPatch] = parse(candidate);
    const [rMaj, rMin, rPatch] = parse(required);
    if (cMaj !== rMaj) return cMaj > rMaj;
    if (cMin !== rMin) return cMin > rMin;
    return cPatch >= rPatch;
  }

  /**
   * Returns true if candidate version is deprecated relative to current.
   */
  isDeprecated(candidate: string, currentPublished: string): boolean {
    return !this.satisfies(candidate, currentPublished);
  }

  // ── Dependency Resolution ─────────────────────────────────

  /**
   * Resolves the dependency order for a set of capabilities using
   * topological sort (Kahn's algorithm).
   * Detects circular dependencies.
   */
  resolveDependencies(
    capabilityKey: string,
    definitions: Map<string, IMarketplaceCapabilityDefinition>,
  ): DependencyResolutionResult {
    const ordered: string[] = [];
    const missing: string[] = [];
    const circular: string[][] = [];

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const visit = (key: string, stack: string[]): void => {
      if (stack.length > MP_CAPABILITY_CONSTANTS.MAX_DEPENDENCY_DEPTH) return;
      if (inStack.has(key)) {
        const cycle = [...stack.slice(stack.indexOf(key)), key];
        circular.push(cycle);
        return;
      }
      if (visited.has(key)) return;

      inStack.add(key);
      const def = definitions.get(key.toUpperCase());
      if (!def) {
        if (key !== capabilityKey.toUpperCase()) missing.push(key);
        inStack.delete(key);
        return;
      }

      for (const dep of (def.dependencies ?? [])) {
        visit(dep.capabilityKey.toUpperCase(), [...stack, key]);
      }

      inStack.delete(key);
      visited.add(key);
      ordered.push(key);
    };

    visit(capabilityKey.toUpperCase(), []);

    return {
      ordered,
      missing,
      circular,
      valid: missing.length === 0 && circular.length === 0,
    };
  }

  /**
   * Checks whether required dependencies are declared for a capability.
   */
  validateDependencies(
    definition: IMarketplaceCapabilityDefinition,
    resolvedCapabilities: Set<string>,
  ): { valid: boolean; missingRequired: string[] } {
    const missingRequired: string[] = [];
    for (const dep of (definition.dependencies ?? [])) {
      if (dep.required && !resolvedCapabilities.has(dep.capabilityKey.toUpperCase())) {
        missingRequired.push(dep.capabilityKey);
      }
    }
    return { valid: missingRequired.length === 0, missingRequired };
  }
}
