import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderCredentialsService } from '../marketplace-provider-credentials.service';
import { MarketplaceProviderCredentialsRepository } from '../marketplace-provider-credentials.repository';
import { MarketplaceCredentialEncryptor } from '../encryptor/marketplace-credential.encryptor';
import { MarketplaceCredentialDecryptor } from '../decryptor/marketplace-credential.decryptor';
import { MarketplaceCredentialValidator } from '../validator/marketplace-credential.validator';
import { MarketplaceCredentialCache } from '../cache/marketplace-credential.cache';
import { MarketplaceCredentialAudit } from '../audit/marketplace-credential.audit';
import { MarketplaceCredentialRotation } from '../rotation/marketplace-credential.rotation';
import { MarketplaceCredentialEventQueue } from '../events/marketplace-credential-events.queue';
import { CredentialEvent, CredentialStatus, CredentialVersionStatus, IMarketplaceProviderCredential } from '../interfaces';

// ── In-memory repository ──────────────────────────────────────

class FakeRepository {
  private records = new Map<string, IMarketplaceProviderCredential>();
  private history: Record<string, unknown>[] = [];
  private idCounter = 0;

  async create(data: Record<string, unknown>): Promise<IMarketplaceProviderCredential> {
    const id = `cred-${++this.idCounter}`;
    const record: IMarketplaceProviderCredential = {
      id,
      workspaceId: data['workspaceId'] as string,
      providerKey: (data['providerKey'] as string).toUpperCase(),
      accountId: data['accountId'] as string | null,
      marketplaceKey: data['marketplaceKey'] as string | null,
      credentialSetName: data['credentialSetName'] as string,
      description: data['description'] as string | null,
      status: (data['status'] as CredentialStatus) ?? CredentialStatus.PENDING_VALIDATION,
      version: 1,
      versionStatus: (data['versionStatus'] as CredentialVersionStatus) ?? CredentialVersionStatus.DRAFT,
      encryptedFields: data['encryptedFields'] as Record<string, string>,
      encryptionVersion: (data['encryptionVersion'] as string) ?? 'v1',
      expiresAt: data['expiresAt'] as Date | null,
      createdBy: data['createdBy'] as string | null,
      updatedBy: data['updatedBy'] as string | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(id, record);
    return record;
  }

  async findById(id: string, workspaceId: string): Promise<IMarketplaceProviderCredential | null> {
    const r = this.records.get(id);
    if (!r || r.deletedAt || r.workspaceId !== workspaceId) return null;
    return r;
  }

  async findActive(providerKey: string, workspaceId: string, accountId?: string | null): Promise<IMarketplaceProviderCredential | null> {
    return [...this.records.values()].find(
      (r) => r.providerKey === providerKey.toUpperCase() && r.workspaceId === workspaceId && r.status === CredentialStatus.ACTIVE && !r.deletedAt && (!accountId || r.accountId === accountId),
    ) ?? null;
  }

  async findMany(filter: Record<string, unknown>): Promise<[IMarketplaceProviderCredential[], number]> {
    const items = [...this.records.values()].filter((r) => !r.deletedAt && r.workspaceId === filter['workspaceId']);
    return [items, items.length];
  }

  async update(id: string, _workspaceId: string, data: Record<string, unknown>): Promise<IMarketplaceProviderCredential> {
    const r = this.records.get(id);
    if (!r) throw new Error(`Not found: ${id}`);
    const updated = { ...r, ...data, updatedAt: new Date() };
    this.records.set(id, updated as IMarketplaceProviderCredential);
    return updated as IMarketplaceProviderCredential;
  }

  async softDelete(id: string, workspaceId: string): Promise<void> {
    const r = this.records.get(id);
    if (r && r.workspaceId === workspaceId) {
      this.records.set(id, { ...r, deletedAt: new Date(), status: CredentialStatus.REVOKED });
    }
  }

  async getNextVersion(_providerKey: string, _workspaceId: string): Promise<number> {
    return 1;
  }

  async createHistory(data: Record<string, unknown>): Promise<void> {
    this.history.push({ id: `h-${Date.now()}`, ...data });
  }

  async findHistory(credentialId: string): Promise<Record<string, unknown>[]> {
    return this.history.filter((h) => h['credentialId'] === credentialId);
  }

  async findHistoryByVersion(credentialId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.history.find((h) => h['credentialId'] === credentialId && h['version'] === version) ?? null;
  }
}

// ── Fake queue ────────────────────────────────────────────────

class FakeQueue {
  readonly events: Record<string, unknown>[] = [];
  async enqueue(payload: Record<string, unknown>): Promise<void> {
    this.events.push(payload);
  }
}

// ── Tests ─────────────────────────────────────────────────────

describe('MarketplaceProviderCredentialsService — Integration', () => {
  let service: MarketplaceProviderCredentialsService;
  let fakeRepo: FakeRepository;
  let fakeQueue: FakeQueue;
  let encryptor: MarketplaceCredentialEncryptor;
  let decryptor: MarketplaceCredentialDecryptor;
  let cache: MarketplaceCredentialCache;

  beforeEach(async () => {
    process.env['ATLAS_CREDENTIAL_KEY'] = 'integration-test-secret-key';
    fakeRepo = new FakeRepository();
    fakeQueue = new FakeQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderCredentialsService,
        { provide: MarketplaceProviderCredentialsRepository, useValue: fakeRepo },
        MarketplaceCredentialEncryptor,
        MarketplaceCredentialDecryptor,
        MarketplaceCredentialValidator,
        MarketplaceCredentialCache,
        { provide: MarketplaceCredentialAudit, useValue: { logChange: jest.fn().mockResolvedValue(undefined), logEvent: jest.fn() } },
        {
          provide: MarketplaceCredentialRotation,
          useFactory: (repo: MarketplaceProviderCredentialsRepository, enc: MarketplaceCredentialEncryptor, audit: MarketplaceCredentialAudit, c: MarketplaceCredentialCache) =>
            new MarketplaceCredentialRotation(repo, enc, audit, c),
          inject: [MarketplaceProviderCredentialsRepository, MarketplaceCredentialEncryptor, MarketplaceCredentialAudit, MarketplaceCredentialCache],
        },
        { provide: MarketplaceCredentialEventQueue, useValue: fakeQueue },
      ],
    }).compile();

    service = module.get(MarketplaceProviderCredentialsService);
    encryptor = module.get(MarketplaceCredentialEncryptor);
    decryptor = module.get(MarketplaceCredentialDecryptor);
    cache = module.get(MarketplaceCredentialCache);
  });

  // ── Full Lifecycle ────────────────────────────────────────

  it('create → validate → disable → enable lifecycle', async () => {
    const created = await service.create(
      'ws-1',
      { providerKey: 'AMAZON_SP', credentialSetName: 'Production', fields: { apiKey: 'AKIATEST', secretKey: 'secretXYZ' } },
      'user-1',
    );
    expect(created.status).toBe(CredentialStatus.PENDING_VALIDATION);
    expect(fakeQueue.events.some((e) => e['event'] === CredentialEvent.CREATED)).toBe(true);

    // Validate
    const validated = await service.validateById(created.id, 'ws-1');
    expect(validated.valid).toBe(true);

    // Enable (PENDING_VALIDATION → ACTIVE via enable)
    const enabled = await service.enable(created.id, 'ws-1');
    expect(enabled.status).toBe(CredentialStatus.ACTIVE);
    expect(fakeQueue.events.some((e) => e['event'] === CredentialEvent.ENABLED)).toBe(true);

    // Disable
    const disabled = await service.disable(created.id, 'ws-1');
    expect(disabled.status).toBe(CredentialStatus.DISABLED);
    expect(fakeQueue.events.some((e) => e['event'] === CredentialEvent.DISABLED)).toBe(true);
  });

  it('encryption round-trip: stored fields decrypt correctly', async () => {
    const plainFields = { apiKey: 'AKIAENCTEST', secretKey: 'mysecret' };
    const created = await service.create(
      'ws-enc',
      { providerKey: 'FLIPKART', credentialSetName: 'Enc Test', fields: plainFields },
    );

    // Load raw credential from repo
    const raw = await fakeRepo.findById(created.id, 'ws-enc');
    expect(raw).not.toBeNull();

    // Decrypt
    const bag = decryptor.decryptCredential(raw!);
    expect(bag.fields['apiKey']).toBe('AKIAENCTEST');
    expect(bag.fields['secretKey']).toBe('mysecret');
  });

  it('rotation encrypts new fields and bumps version', async () => {
    const created = await service.create(
      'ws-2',
      { providerKey: 'SHOPIFY', credentialSetName: 'Rotation Test', fields: { apiKey: 'OLD_KEY' } },
      'user-1',
    );

    const result = await service.rotate(
      created.id,
      'ws-2',
      { newFields: { apiKey: 'NEW_KEY' }, reason: 'Scheduled rotation' },
      'user-1',
    );

    expect(result.newVersion).toBeGreaterThan(result.previousVersion);
    expect(fakeQueue.events.some((e) => e['event'] === CredentialEvent.ROTATED)).toBe(true);

    // Verify new key is encrypted and decryptable
    const raw = await fakeRepo.findById(created.id, 'ws-2');
    const bag = decryptor.decryptCredential(raw!);
    expect(bag.fields['apiKey']).toBe('NEW_KEY');
  });

  it('cache serves subsequent resolveActive calls without DB hit', async () => {
    const created = await service.create(
      'ws-cache',
      { providerKey: 'EBAY', credentialSetName: 'Cache Test', fields: { apiKey: 'KEY' } },
    );

    // Manually mark as ACTIVE
    await fakeRepo.update(created.id, 'ws-cache', { status: CredentialStatus.ACTIVE });

    // First call: DB hit
    const first = await service.resolveActive('EBAY', 'ws-cache');
    expect(first).not.toBeNull();

    // Second call: from cache
    const repoSpy = jest.spyOn(fakeRepo, 'findActive');
    const second = await service.resolveActive('EBAY', 'ws-cache');
    expect(repoSpy).not.toHaveBeenCalled();
    expect(second?.id).toBe(first?.id);
  });

  it('workspace isolation: cannot read credential from another workspace', async () => {
    const created = await service.create(
      'ws-A',
      { providerKey: 'AMAZON_SP', credentialSetName: 'Isolated', fields: { apiKey: 'KEY' } },
    );

    await expect(service.findById(created.id, 'ws-B')).rejects.toThrow(NotFoundException);
  });

  it('revoke prevents further mutations', async () => {
    const created = await service.create(
      'ws-rev',
      { providerKey: 'MEESHO', credentialSetName: 'R', fields: { apiKey: 'K' } },
    );
    await service.enable(created.id, 'ws-rev');
    await service.revoke(created.id, 'ws-rev');

    await expect(service.update(created.id, 'ws-rev', { credentialSetName: 'New' })).rejects.toThrow(BadRequestException);
  });

  it('soft delete marks deleted and emits event', async () => {
    const created = await service.create(
      'ws-del',
      { providerKey: 'WALMART', credentialSetName: 'Delete Test', fields: { apiKey: 'K' } },
    );

    await service.delete(created.id, 'ws-del');

    const eventsHasDeleted = fakeQueue.events.some((e) => e['event'] === CredentialEvent.DELETED);
    expect(eventsHasDeleted).toBe(true);

    // Cannot find after soft delete
    await expect(service.findById(created.id, 'ws-del')).rejects.toThrow(NotFoundException);
  });

  it('update merges partial fields without losing existing ones', async () => {
    const created = await service.create(
      'ws-upd',
      { providerKey: 'AMAZON_SP', credentialSetName: 'Update Test', fields: { apiKey: 'OLD', secretKey: 'S' } },
    );

    await service.update(created.id, 'ws-upd', { fields: { apiKey: 'NEW' } }, 'user-1');

    const raw = await fakeRepo.findById(created.id, 'ws-upd');
    // Both keys should exist after partial update
    expect(Object.keys(raw!.encryptedFields)).toEqual(expect.arrayContaining(['apiKey', 'secretKey']));

    // New apiKey should decrypt to 'NEW'
    const bag = decryptor.decryptCredential(raw!);
    expect(bag.fields['apiKey']).toBe('NEW');
    expect(bag.fields['secretKey']).toBe('S');
  });

  it('search / findAll returns workspace-scoped results', async () => {
    await service.create('ws-search', { providerKey: 'AMAZON_SP', credentialSetName: 'A', fields: { apiKey: 'K1' } });
    await service.create('ws-search', { providerKey: 'FLIPKART', credentialSetName: 'B', fields: { apiKey: 'K2' } });
    await service.create('ws-other', { providerKey: 'AMAZON_SP', credentialSetName: 'C', fields: { apiKey: 'K3' } });

    const result = await service.findAll('ws-search', { page: 1, limit: 10 });
    expect(result.items.length).toBe(2);
    expect(result.items.every((i) => i.workspaceId === 'ws-search')).toBe(true);
  });

  it('history tracks all mutations', async () => {
    const created = await service.create(
      'ws-hist',
      { providerKey: 'AMAZON_SP', credentialSetName: 'H', fields: { apiKey: 'K' } },
    );
    await service.update(created.id, 'ws-hist', { credentialSetName: 'H Updated' });
    await service.update(created.id, 'ws-hist', { credentialSetName: 'H Updated 2' });

    const history = await service.getHistory(created.id, 'ws-hist');
    // At least: create + 2 updates (pre-update snapshots)
    expect(history.length).toBeGreaterThanOrEqual(2);
    // History never exposes encryptedFields
    expect((history[0] as unknown as Record<string, unknown>)['encryptedFields']).toBeUndefined();
  });
});
