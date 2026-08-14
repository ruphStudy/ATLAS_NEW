import { Injectable } from '@nestjs/common';
import { IAiProvider } from '../../../ai/interfaces';
import { AiProviderRegistry } from '../../../ai/registry/ai-provider.registry';
import {
  AdapterCompatibilityStatus,
  IAdapterCompatibilityResult,
  IExpansionValidationError,
  IExpansionValidationResult,
} from '../interfaces';

export interface IExpansionCandidate {
  providerKey: string;
  eligibleWorkspaceIds?: string[];
}

/**
 * AiProviderExpansionValidator
 *
 * Structural validation of an expansion's own fields, plus a runtime
 * duck-type check of the registered `IAiProvider` instance against its
 * contract — required because concrete providers register themselves
 * dynamically (see `AiProviderRegistry.register`), which performs zero
 * structural validation of its own. Never re-implements the foundation
 * registry, factory, capability matrix or health service it reads from.
 */
@Injectable()
export class AiProviderExpansionValidator {
  constructor(private readonly registry: AiProviderRegistry) {}

  validate(candidate: IExpansionCandidate): IExpansionValidationResult {
    const errors: IExpansionValidationError[] = [];
    const warnings: string[] = [];

    if (!candidate.providerKey?.trim()) {
      errors.push({ field: 'providerKey', message: 'providerKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }

    if (candidate.providerKey && !this.registry.has(candidate.providerKey)) {
      warnings.push(
        `Provider '${candidate.providerKey}' is not yet registered in the AI Provider Foundation — this expansion can stay DRAFT until it is`,
      );
    }

    const seen = new Set<string>();
    for (const workspaceId of candidate.eligibleWorkspaceIds ?? []) {
      if (seen.has(workspaceId)) {
        errors.push({
          field: 'eligibleWorkspaceIds',
          message: `Duplicate workspaceId '${workspaceId}' in eligibleWorkspaceIds`,
          code: 'DUPLICATE_WORKSPACE',
        });
      }
      seen.add(workspaceId);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Structurally validates the registered `IAiProvider` for `providerKey`
   * against its contract — required metadata fields, and every required
   * method being an actual function. Capability members
   * (textGeneration/reasoning/vision/imageGeneration/embedding/
   * validation) are intentionally not required here since the contract
   * itself declares them optional — a provider only implements the ones
   * matching the capabilities in its own metadata.
   */
  async validateAdapterCompatibility(providerKey: string): Promise<IAdapterCompatibilityResult> {
    const checkedAt = new Date();

    if (!this.registry.has(providerKey)) {
      return {
        providerKey,
        status: AdapterCompatibilityStatus.INCOMPATIBLE,
        issues: [`No adapter is registered for provider '${providerKey}' in the AI Provider Foundation`],
        checkedAt,
      };
    }

    const provider = this.registry.get(providerKey);
    const issues = this.checkProviderShape(provider);

    return {
      providerKey,
      status: issues.length === 0 ? AdapterCompatibilityStatus.COMPATIBLE : AdapterCompatibilityStatus.INCOMPATIBLE,
      issues,
      checkedAt,
    };
  }

  private checkProviderShape(provider: IAiProvider): string[] {
    const issues: string[] = [];

    const requiredMethods: Array<keyof IAiProvider> = [
      'getMetadata',
      'initialize',
      'getHealth',
      'supportsCapability',
      'resolveModel',
    ];
    for (const method of requiredMethods) {
      if (typeof provider[method] !== 'function') {
        issues.push(`Provider does not implement required method '${String(method)}'`);
      }
    }

    if (typeof provider.getMetadata !== 'function') {
      return issues;
    }

    const metadata = provider.getMetadata();
    if (!metadata || typeof metadata !== 'object') {
      issues.push('getMetadata() must return IAiProviderMetadata');
      return issues;
    }

    if (!metadata.providerKey) issues.push('metadata.providerKey is required');
    if (!metadata.displayName) issues.push('metadata.displayName is required');
    if (!metadata.version) issues.push('metadata.version is required');
    if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
      issues.push('metadata.capabilities must declare at least one capability');
    }
    if (!Array.isArray(metadata.supportedModels)) {
      issues.push('metadata.supportedModels must be an array');
    }

    return issues;
  }
}
