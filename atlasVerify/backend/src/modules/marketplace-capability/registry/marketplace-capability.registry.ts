import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
  CapabilityStatus,
  CapabilitySupportLevel,
  CapabilityCategory,
} from '../interfaces';

/**
 * MarketplaceCapabilityRegistry
 *
 * In-memory registry of all registered capability definitions and
 * provider declarations. Seeded from the database on startup and
 * kept in sync by the service on every write.
 *
 * This registry is used for fast local look-ups without DB round-trips.
 * It does NOT replace the database — persistence is owned by the repository.
 */
@Injectable()
export class MarketplaceCapabilityRegistry {
  private readonly logger = new Logger(MarketplaceCapabilityRegistry.name);

  /** capabilityKey → definition */
  private readonly definitions = new Map<string, IMarketplaceCapabilityDefinition>();

  /** `${providerKey}:${capabilityKey}:${workspaceId|global}:${accountId|any}` → declaration */
  private readonly declarations = new Map<string, IMarketplaceProviderCapabilityDeclaration>();

  // ── Definitions ───────────────────────────────────────────

  register(definition: IMarketplaceCapabilityDefinition): void {
    this.definitions.set(definition.capabilityKey.toUpperCase(), definition);
  }

  unregister(capabilityKey: string): void {
    this.definitions.delete(capabilityKey.toUpperCase());
  }

  getDefinition(capabilityKey: string): IMarketplaceCapabilityDefinition | undefined {
    return this.definitions.get(capabilityKey.toUpperCase());
  }

  getAllDefinitions(): IMarketplaceCapabilityDefinition[] {
    return [...this.definitions.values()];
  }

  getActiveDefinitions(): IMarketplaceCapabilityDefinition[] {
    return this.getAllDefinitions().filter(
      (d) => d.status === CapabilityStatus.ACTIVE || d.status === CapabilityStatus.EXPERIMENTAL,
    );
  }

  getDefinitionsByCategory(category: CapabilityCategory): IMarketplaceCapabilityDefinition[] {
    return this.getAllDefinitions().filter((d) => d.category === category);
  }

  isRegistered(capabilityKey: string): boolean {
    return this.definitions.has(capabilityKey.toUpperCase());
  }

  get definitionCount(): number {
    return this.definitions.size;
  }

  // ── Provider Declarations ─────────────────────────────────

  private declarationKey(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
  ): string {
    return [
      providerKey.toUpperCase(),
      capabilityKey.toUpperCase(),
      workspaceId ?? 'global',
      accountId ?? 'any',
    ].join(':');
  }

  declareProviderCapability(declaration: IMarketplaceProviderCapabilityDeclaration): void {
    const key = this.declarationKey(
      declaration.providerKey,
      declaration.capabilityKey,
      declaration.workspaceId,
      declaration.accountId,
    );
    this.declarations.set(key, declaration);
  }

  removeDeclaration(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
  ): void {
    this.declarations.delete(this.declarationKey(providerKey, capabilityKey, workspaceId, accountId));
  }

  getDeclaration(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
  ): IMarketplaceProviderCapabilityDeclaration | undefined {
    // Try most specific first → workspace+account → workspace → global
    const candidates = [
      this.declarationKey(providerKey, capabilityKey, workspaceId, accountId),
      this.declarationKey(providerKey, capabilityKey, workspaceId, null),
      this.declarationKey(providerKey, capabilityKey, null, null),
    ];
    for (const k of candidates) {
      const d = this.declarations.get(k);
      if (d && d.status !== CapabilityStatus.ARCHIVED && d.deletedAt == null) return d;
    }
    return undefined;
  }

  getDeclarationsForProvider(
    providerKey: string,
    workspaceId?: string | null,
  ): IMarketplaceProviderCapabilityDeclaration[] {
    const prefix = `${providerKey.toUpperCase()}:`;
    return [...this.declarations.values()].filter(
      (d) =>
        d.providerKey.toUpperCase() === providerKey.toUpperCase() &&
        d.deletedAt == null &&
        (!workspaceId || d.workspaceId == null || d.workspaceId === workspaceId),
    );
  }

  getDeclarationsForCapability(capabilityKey: string): IMarketplaceProviderCapabilityDeclaration[] {
    return [...this.declarations.values()].filter(
      (d) => d.capabilityKey.toUpperCase() === capabilityKey.toUpperCase() && d.deletedAt == null,
    );
  }

  getSupportedCapabilitiesForProvider(
    providerKey: string,
    workspaceId?: string | null,
  ): string[] {
    return this.getDeclarationsForProvider(providerKey, workspaceId)
      .filter((d) => d.supportLevel !== CapabilitySupportLevel.UNSUPPORTED)
      .map((d) => d.capabilityKey);
  }

  seed(
    definitions: IMarketplaceCapabilityDefinition[],
    declarations: IMarketplaceProviderCapabilityDeclaration[],
  ): void {
    this.definitions.clear();
    this.declarations.clear();
    definitions.forEach((d) => this.register(d));
    declarations.forEach((d) => this.declareProviderCapability(d));
    this.logger.log(
      `Registry seeded: ${this.definitions.size} definitions, ${this.declarations.size} declarations`,
    );
  }

  flush(): void {
    this.definitions.clear();
    this.declarations.clear();
  }
}
