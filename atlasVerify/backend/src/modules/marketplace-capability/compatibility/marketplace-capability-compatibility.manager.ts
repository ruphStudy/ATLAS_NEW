import { Injectable } from '@nestjs/common';
import {
  CompatibilityCheckRequest,
  CompatibilityCheckResult,
  CompatibilityIssue,
  CompatibilityIssueType,
  CapabilityStatus,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
} from '../interfaces';
import { MP_CAPABILITY_CONSTANTS } from '../constants';

// Minimal semver-like comparison. Only handles "major.minor.patch" strings.
function parseSemver(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function semverLt(a: string, b: string): boolean {
  const [aMaj, aMin, aPatch] = parseSemver(a);
  const [bMaj, bMin, bPatch] = parseSemver(b);
  if (aMaj !== bMaj) return aMaj < bMaj;
  if (aMin !== bMin) return aMin < bMin;
  return aPatch < bPatch;
}

@Injectable()
export class MarketplaceCapabilityCompatibilityManager {
  /**
   * Checks whether the given combination of versions is mutually compatible.
   */
  check(
    request: CompatibilityCheckRequest,
    definition: IMarketplaceCapabilityDefinition,
    declaration?: IMarketplaceProviderCapabilityDeclaration | null,
  ): CompatibilityCheckResult {
    const issues: CompatibilityIssue[] = [];
    const warnings: string[] = [];

    // Deprecated capability
    if (definition.status === CapabilityStatus.DEPRECATED) {
      issues.push({
        type: CompatibilityIssueType.DEPRECATED_CAPABILITY,
        message: `Capability '${definition.capabilityKey}' is deprecated`,
        detail: 'Consider migrating to a supported alternative',
        retryable: false,
      });
    }

    // Required provider version
    if (definition.requiredProviderVersion && request.providerVersion) {
      if (semverLt(request.providerVersion, definition.requiredProviderVersion)) {
        issues.push({
          type: CompatibilityIssueType.UNSUPPORTED_PROVIDER_VERSION,
          message: `Provider version '${request.providerVersion}' is below required '${definition.requiredProviderVersion}'`,
          detail: `Capability '${definition.capabilityKey}' requires provider >= ${definition.requiredProviderVersion}`,
          retryable: false,
        });
      }
    }

    // Required API version
    if (definition.requiredApiVersion && request.apiVersion) {
      if (semverLt(request.apiVersion, definition.requiredApiVersion)) {
        issues.push({
          type: CompatibilityIssueType.UNSUPPORTED_API_VERSION,
          message: `API version '${request.apiVersion}' is below required '${definition.requiredApiVersion}'`,
          detail: `Capability '${definition.capabilityKey}' requires API >= ${definition.requiredApiVersion}`,
          retryable: false,
        });
      }
    }

    // Declared capability version vs. requested version
    if (request.capabilityVersion && declaration?.capabilityVersion) {
      if (request.capabilityVersion !== declaration.capabilityVersion) {
        issues.push({
          type: CompatibilityIssueType.VERSION_CONFLICT,
          message: `Requested capability version '${request.capabilityVersion}' does not match declared '${declaration.capabilityVersion}'`,
          detail: null,
          retryable: false,
        });
      }
    }

    // Adapter version mismatch (informational)
    if (request.adapterVersion && declaration?.providerVersion) {
      if (semverLt(request.adapterVersion, declaration.providerVersion)) {
        warnings.push(
          `Adapter version '${request.adapterVersion}' is older than declared provider version '${declaration.providerVersion}'`,
        );
      }
    }

    // Listing mapping version warning
    if (request.listingMappingVersion) {
      warnings.push(
        `Listing mapping version '${request.listingMappingVersion}' detected — verify schema compatibility`,
      );
    }

    // Marketplace schema version
    if (request.marketplaceSchemaVersion) {
      warnings.push(
        `Marketplace schema version '${request.marketplaceSchemaVersion}' detected — verify transformation compatibility`,
      );
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
    };
  }
}
