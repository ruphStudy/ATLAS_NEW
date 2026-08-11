import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketplaceCapabilityService } from '../marketplace-capability.service';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityCache } from '../cache/marketplace-capability.cache';
import { MarketplaceCapabilityValidator } from '../validator/marketplace-capability.validator';
import { MarketplaceCapabilityResolver } from '../resolver/marketplace-capability.resolver';
import { MarketplaceCapabilityVersionManager } from '../version/marketplace-capability-version.manager';
import { MarketplaceCapabilityCompatibilityManager } from '../compatibility/marketplace-capability-compatibility.manager';
import { MarketplaceCapabilityAudit } from '../audit/marketplace-capability.audit';
import { MarketplaceCapabilityEventQueue } from '../events/marketplace-capability-events.queue';
import { MarketplaceCapabilityMetrics } from '../metrics/marketplace-capability.metrics';
import {
  CapabilityCategory,
  CapabilityStatus,
  CapabilitySupportLevel,
  CapabilityResolutionStatus,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
  CapabilityEvent,
} from '../interfaces';
import { CreateCapabilityDto, DeclareProviderCapabilityDto } from '../dto';

// ── In-Memory Fake Repository ─────────────────────────────────

class FakeCapabilityRepository {
  private definitions = new Map<string, Record<string, unknown>>();
  private declarations = new Map<string, Record<string, unknown>>();
  private overrides: Record<string, unknown>[] = [];
  private history: Record<string, unknown>[] = [];
  private idSeq = 0;

  private nextId() { return `id-${++this.idSeq}`; }

  async createDefinition(data: Record<string, unknown>) {
    const id = this.nextId();
    const rec = { id, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
    this.definitions.set(id, rec);
    return rec;
  }

  async findDefinitionById(id: string) {
    const d = this.definitions.get(id);
    return d && !d['deletedAt'] ? d : null;
  }

  async findDefinitionByKey(key: string) {
    for (const d of this.definitions.values()) {
      if ((d['capabilityKey'] as string)?.toUpperCase() === key.toUpperCase() && !d['deletedAt']) return d;
    }
    return null;
  }

  async findDefinitions(filter: Record<string, unknown>): Promise<[Record<string, unknown>[], number]> {
    const all = [...this.definitions.values()].filter((d) => {
      if (d['deletedAt']) return false;
      if (filter['status'] && d['status'] !== filter['status']) return false;
      return true;
    });
    return [all, all.length];
  }

  async updateDefinition(id: string, data: Record<string, unknown>) {
    const existing = this.definitions.get(id);
    if (!existing) throw new Error(`Definition ${id} not found`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.definitions.set(id, updated);
    return updated;
  }

  async softDeleteDefinition(id: string, userId?: string) {
    return this.updateDefinition(id, { deletedAt: new Date(), updatedBy: userId });
  }

  async getNextVersion(key: string): Promise<number> {
    let max = 0;
    for (const d of this.definitions.values()) {
      if ((d['capabilityKey'] as string)?.toUpperCase() === key.toUpperCase()) {
        max = Math.max(max, d['version'] as number ?? 0);
      }
    }
    return max + 1;
  }

  async createDefinitionHistory(data: Record<string, unknown>) {
    this.history.push(data);
    return data;
  }

  async findDefinitionHistory(definitionId: string) {
    return this.history.filter((h) => h['definitionId'] === definitionId);
  }

  async upsertDeclaration(data: Record<string, unknown>) {
    const id = this.nextId();
    const rec = { id, createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
    this.declarations.set(id, rec);
    return rec;
  }

  async findDeclaration(providerKey: string, capabilityKey: string) {
    for (const d of this.declarations.values()) {
      if (
        (d['providerKey'] as string)?.toUpperCase() === providerKey.toUpperCase() &&
        (d['capabilityKey'] as string)?.toUpperCase() === capabilityKey.toUpperCase() &&
        !d['deletedAt']
      ) return d;
    }
    return null;
  }

  async findDeclarations(providerKey: string) {
    return [...this.declarations.values()].filter(
      (d) => (d['providerKey'] as string)?.toUpperCase() === providerKey.toUpperCase() && !d['deletedAt'],
    );
  }

  async updateDeclaration(id: string, data: Record<string, unknown>) {
    const existing = this.declarations.get(id);
    if (!existing) throw new Error(`Declaration ${id} not found`);
    const updated = { ...existing, ...data };
    this.declarations.set(id, updated);
    return updated;
  }

  async softDeleteDeclaration(id: string, userId?: string) {
    return this.updateDeclaration(id, { deletedAt: new Date(), updatedBy: userId });
  }

  async createOverride(data: Record<string, unknown>) {
    const rec = { id: this.nextId(), createdAt: new Date(), updatedAt: new Date(), deletedAt: null, ...data };
    this.overrides.push(rec);
    return rec;
  }

  async findOverrides(capabilityKey: string) {
    return this.overrides.filter(
      (o) => (o['capabilityKey'] as string)?.toUpperCase() === capabilityKey.toUpperCase() && !o['deletedAt'],
    );
  }

  async updateOverride(id: string, data: Record<string, unknown>) {
    const idx = this.overrides.findIndex((o) => o['id'] === id);
    if (idx === -1) throw new Error('Override not found');
    this.overrides[idx] = { ...this.overrides[idx], ...data };
    return this.overrides[idx];
  }

  async softDeleteOverride(id: string, userId?: string) {
    return this.updateOverride(id, { deletedAt: new Date(), updatedBy: userId });
  }
}

// ── Helpers ───────────────────────────────────────────────────

function makeCreateDto(overrides?: Partial<CreateCapabilityDto>): CreateCapabilityDto {
  const dto = new CreateCapabilityDto();
  dto.capabilityKey = 'PUBLISH_LISTING';
  dto.name = 'Publish Listing';
  dto.category = CapabilityCategory.LISTING;
  return Object.assign(dto, overrides);
}

function makeDeclareDto(overrides?: Partial<DeclareProviderCapabilityDto>): DeclareProviderCapabilityDto {
  const dto = new DeclareProviderCapabilityDto();
  dto.providerKey = 'AMAZON_SP';
  dto.capabilityKey = 'PUBLISH_LISTING';
  dto.workspaceId = 'ws-1';
  dto.supportLevel = CapabilitySupportLevel.FULL;
  return Object.assign(dto, overrides);
}

// ── Test Suite ────────────────────────────────────────────────

describe('MarketplaceCapabilityService — Integration (fake repo)', () => {
  let service: MarketplaceCapabilityService;
  let registry: MarketplaceCapabilityRegistry;
  let cache: MarketplaceCapabilityCache;
  let metrics: MarketplaceCapabilityMetrics;
  let fakeRepo: FakeCapabilityRepository;
  let eventQueue: { enqueue: jest.Mock; events: Record<string, unknown>[] };

  beforeEach(async () => {
    fakeRepo = new FakeCapabilityRepository();
    eventQueue = {
      enqueue: jest.fn().mockImplementation((p) => { eventQueue.events.push(p); return Promise.resolve(); }),
      events: [],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceCapabilityService,
        MarketplaceCapabilityRegistry,
        MarketplaceCapabilityCache,
        MarketplaceCapabilityValidator,
        MarketplaceCapabilityMetrics,
        MarketplaceCapabilityVersionManager,
        MarketplaceCapabilityCompatibilityManager,
        {
          provide: MarketplaceCapabilityResolver,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              status: CapabilityResolutionStatus.SUPPORTED,
              capabilityKey: 'PUBLISH_LISTING',
              providerKey: 'AMAZON_SP',
              workspaceId: 'ws-1',
              supportLevel: CapabilitySupportLevel.FULL,
              declaration: null,
              definition: null,
              reasons: [],
              resolvedAt: new Date(),
              resolutionTimeMs: 5,
            }),
          },
        },
        {
          provide: 'MarketplaceCapabilityRepository',
          useValue: fakeRepo,
        },
        {
          provide: MarketplaceCapabilityAudit,
          useValue: { logDefinitionChange: jest.fn(), logEvent: jest.fn() },
        },
        { provide: MarketplaceCapabilityEventQueue, useValue: eventQueue },
      ],
    })
      .overrideProvider('MarketplaceCapabilityRepository' as any)
      .useValue(fakeRepo)
      .compile();

    // Manually wire since we use fake repo
    registry = module.get(MarketplaceCapabilityRegistry);
    cache = module.get(MarketplaceCapabilityCache);
    metrics = module.get(MarketplaceCapabilityMetrics);

    // Build service manually to inject fake repo
    service = new MarketplaceCapabilityService(
      fakeRepo as any,
      registry,
      cache,
      module.get(MarketplaceCapabilityValidator),
      module.get(MarketplaceCapabilityResolver),
      module.get(MarketplaceCapabilityVersionManager),
      module.get(MarketplaceCapabilityCompatibilityManager),
      module.get(MarketplaceCapabilityAudit),
      eventQueue as any,
      metrics,
    );
  });

  // ── Registration ──────────────────────────────────────────

  it('creates a capability definition', async () => {
    const result = await service.createCapability(makeCreateDto(), 'user-1');
    expect(result.capabilityKey).toBe('PUBLISH_LISTING');
    expect(result.status).toBe(CapabilityStatus.DRAFT);
  });

  it('prevents duplicate capability registration', async () => {
    await service.createCapability(makeCreateDto());
    await expect(service.createCapability(makeCreateDto())).rejects.toThrow(ConflictException);
  });

  it('updates a capability', async () => {
    const created = await service.createCapability(makeCreateDto());
    const updated = await service.updateCapability(created.id, { name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
  });

  // ── Lifecycle transitions ─────────────────────────────────

  it('enables a draft capability', async () => {
    const created = await service.createCapability(makeCreateDto());
    const enabled = await service.enableCapability(created.id);
    expect(enabled.status).toBe(CapabilityStatus.ACTIVE);
  });

  it('disables an active capability', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.enableCapability(created.id);
    const disabled = await service.disableCapability(created.id);
    expect(disabled.status).toBe(CapabilityStatus.DISABLED);
  });

  it('archives an active capability', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.enableCapability(created.id);
    const archived = await service.archiveCapability(created.id);
    expect(archived.status).toBe(CapabilityStatus.ARCHIVED);
  });

  it('rejects invalid transition (archived → active)', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.enableCapability(created.id);
    await service.archiveCapability(created.id);
    await expect(service.enableCapability(created.id)).rejects.toThrow(BadRequestException);
  });

  // ── Provider Declaration ──────────────────────────────────

  it('declares provider capability', async () => {
    await service.createCapability(makeCreateDto());
    const result = await service.declareProviderCapability(makeDeclareDto());
    expect(result.providerKey).toBe('AMAZON_SP');
    expect(result.supportLevel).toBe(CapabilitySupportLevel.FULL);
  });

  it('emits PROVIDER_CAPABILITY_DECLARED event on declaration', async () => {
    await service.createCapability(makeCreateDto());
    await service.declareProviderCapability(makeDeclareDto());
    expect(eventQueue.events.some((e) => e['event'] === CapabilityEvent.PROVIDER_CAPABILITY_DECLARED)).toBe(true);
  });

  // ── Cache ─────────────────────────────────────────────────

  it('warms definition cache on findByKey', async () => {
    await service.createCapability(makeCreateDto());
    await service.findByKey('PUBLISH_LISTING');
    expect(cache.getDefinition('PUBLISH_LISTING')).not.toBeNull();
  });

  it('cache invalidation clears definition cache', async () => {
    await service.createCapability(makeCreateDto());
    await service.findByKey('PUBLISH_LISTING');
    await service.invalidateCache('PUBLISH_LISTING');
    expect(cache.getDefinition('PUBLISH_LISTING')).toBeNull();
  });

  // ── Events ────────────────────────────────────────────────

  it('emits CREATED event on creation', async () => {
    await service.createCapability(makeCreateDto());
    expect(eventQueue.events.some((e) => e['event'] === CapabilityEvent.CREATED)).toBe(true);
  });

  it('emits ENABLED event on enable', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.enableCapability(created.id);
    expect(eventQueue.events.some((e) => e['event'] === CapabilityEvent.ENABLED)).toBe(true);
  });

  it('emits VERSION_PUBLISHED on publishCapabilityVersion', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.publishCapabilityVersion(created.id);
    expect(eventQueue.events.some((e) => e['event'] === CapabilityEvent.VERSION_PUBLISHED)).toBe(true);
  });

  // ── Soft Delete ───────────────────────────────────────────

  it('soft deletes a capability', async () => {
    const created = await service.createCapability(makeCreateDto());
    await service.deleteCapability(created.id);
    await expect(service.findById(created.id)).rejects.toThrow(NotFoundException);
  });

  // ── Metrics ───────────────────────────────────────────────

  it('records validation success/failure in metrics', async () => {
    await service.createCapability(makeCreateDto());
    await service.validateCapability({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' });
    // declaration not declared → validation should fail
    const agg = service.getMetrics() as ReturnType<typeof metrics.getAggregate>;
    expect(agg.totalValidationFailures).toBeGreaterThan(0);
  });

  // ── Permission validation (workspace isolation) ───────────

  it('workspace-specific declarations do not affect other workspaces', async () => {
    await service.createCapability(makeCreateDto());
    await service.declareProviderCapability(makeDeclareDto({ workspaceId: 'ws-A' }));
    // Registry should have declaration for ws-A
    const decl = registry.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-A');
    expect(decl).not.toBeUndefined();
    // ws-B should not see it (no global fallback)
    const declB = registry.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-B');
    expect(declB).toBeUndefined();
  });

  // ── Clone ─────────────────────────────────────────────────

  it('clones a capability with new key', async () => {
    await service.createCapability(makeCreateDto());
    const cloned = await service.cloneCapability((await fakeRepo.findDefinitionByKey('PUBLISH_LISTING') as any).id, 'PUBLISH_LISTING_V2');
    expect(cloned.capabilityKey).toBe('PUBLISH_LISTING_V2');
  });

  // ── History ───────────────────────────────────────────────

  it('records history on create', async () => {
    const created = await service.createCapability(makeCreateDto());
    const history = await service.getHistory(created.id);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });
});
