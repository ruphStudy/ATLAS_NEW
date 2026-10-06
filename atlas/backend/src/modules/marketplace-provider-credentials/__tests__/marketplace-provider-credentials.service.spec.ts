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

// ── Factories ─────────────────────────────────────────────────

const mockRepo = () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findActive: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  getNextVersion: jest.fn(),
  createHistory: jest.fn(),
  findHistory: jest.fn(),
  findHistoryByVersion: jest.fn(),
});

const mockEncryptor = () => ({
  encryptField: jest.fn((v) => `encrypted:${v}`),
  encryptFields: jest.fn((fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, `enc:${v as string}`]))),
  maskFields: jest.fn((fields) => Object.fromEntries(Object.keys(fields).map((k) => [k, '***MASKED***']))),
  deriveKey: jest.fn(),
});

const mockDecryptor = () => ({
  decryptCredential: jest.fn((cred: IMarketplaceProviderCredential) => ({
    credentialId: cred.id,
    workspaceId: cred.workspaceId,
    providerKey: cred.providerKey,
    fields: { apiKey: 'plain-key' },
  })),
  decryptField: jest.fn(),
  decryptFields: jest.fn(),
});

const mockValidator = () => ({
  validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [], expired: false, missingFields: [] }),
  validateSchema: jest.fn(),
  validateRequiredFieldKeys: jest.fn(),
});

const mockCache = () => ({
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateById: jest.fn(),
  invalidateByProvider: jest.fn(),
  invalidateByWorkspace: jest.fn(),
  flush: jest.fn(),
  size: jest.fn().mockReturnValue(0),
});

const mockAudit = () => ({
  logChange: jest.fn().mockResolvedValue(undefined),
  logEvent: jest.fn(),
});

const mockRotation = () => ({
  rotate: jest.fn(),
  schedule: jest.fn(),
});

const mockQueue = () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
});

// ── Helper ────────────────────────────────────────────────────

function makeCredential(overrides?: Partial<IMarketplaceProviderCredential>): IMarketplaceProviderCredential {
  return {
    id: 'cred-1',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    credentialSetName: 'default',
    status: CredentialStatus.PENDING_VALIDATION,
    version: 1,
    versionStatus: CredentialVersionStatus.DRAFT,
    encryptedFields: { apiKey: 'enc:AKIAXXXX' },
    encryptionVersion: 'v1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('MarketplaceProviderCredentialsService', () => {
  let service: MarketplaceProviderCredentialsService;
  let repo: ReturnType<typeof mockRepo>;
  let encryptor: ReturnType<typeof mockEncryptor>;
  let validator: ReturnType<typeof mockValidator>;
  let cache: ReturnType<typeof mockCache>;
  let audit: ReturnType<typeof mockAudit>;
  let rotation: ReturnType<typeof mockRotation>;
  let queue: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderCredentialsService,
        { provide: MarketplaceProviderCredentialsRepository, useFactory: mockRepo },
        { provide: MarketplaceCredentialEncryptor, useFactory: mockEncryptor },
        { provide: MarketplaceCredentialDecryptor, useFactory: mockDecryptor },
        { provide: MarketplaceCredentialValidator, useFactory: mockValidator },
        { provide: MarketplaceCredentialCache, useFactory: mockCache },
        { provide: MarketplaceCredentialAudit, useFactory: mockAudit },
        { provide: MarketplaceCredentialRotation, useFactory: mockRotation },
        { provide: MarketplaceCredentialEventQueue, useFactory: mockQueue },
      ],
    }).compile();

    service = module.get(MarketplaceProviderCredentialsService);
    repo = module.get(MarketplaceProviderCredentialsRepository) as unknown as ReturnType<typeof mockRepo>;
    encryptor = module.get(MarketplaceCredentialEncryptor) as unknown as ReturnType<typeof mockEncryptor>;
    validator = module.get(MarketplaceCredentialValidator) as unknown as ReturnType<typeof mockValidator>;
    cache = module.get(MarketplaceCredentialCache) as unknown as ReturnType<typeof mockCache>;
    audit = module.get(MarketplaceCredentialAudit) as unknown as ReturnType<typeof mockAudit>;
    rotation = module.get(MarketplaceCredentialRotation) as unknown as ReturnType<typeof mockRotation>;
    queue = module.get(MarketplaceCredentialEventQueue) as unknown as ReturnType<typeof mockQueue>;
  });

  // ── Create ────────────────────────────────────────────────

  describe('create()', () => {
    it('encrypts fields, stores credential, emits CREATED event', async () => {
      const raw = makeCredential();
      repo.create.mockResolvedValue(raw);

      const result = await service.create(
        'ws-1',
        { providerKey: 'AMAZON_SP', credentialSetName: 'default', fields: { apiKey: 'KEY' } },
        'user-1',
      );

      expect(encryptor.encryptFields).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledTimes(1);
      expect(audit.logChange).toHaveBeenCalled();
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.CREATED }));
      expect(result.id).toBe('cred-1');
      // encryptedFields must not appear in response
      expect((result as unknown as Record<string, unknown>)['encryptedFields']).toBeUndefined();
    });

    it('throws BadRequestException when validation fails', async () => {
      validator.validate.mockReturnValue({ valid: false, errors: [{ field: 'apiKey', message: 'Missing', code: 'MISSING' }], warnings: [], expired: false, missingFields: ['apiKey'] });

      await expect(
        service.create('ws-1', { providerKey: 'AMAZON_SP', credentialSetName: 'x', fields: {} }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  // ── Read ──────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns CredentialResponseDto', async () => {
      repo.findById.mockResolvedValue(makeCredential());
      const result = await service.findById('cred-1', 'ws-1');
      expect(result.id).toBe('cred-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('cred-99', 'ws-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll()', () => {
    it('returns paginated response', async () => {
      repo.findMany.mockResolvedValue([[makeCredential(), makeCredential({ id: 'cred-2' })], 2]);
      const result = await service.findAll('ws-1', { page: 1, limit: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  // ── Update ────────────────────────────────────────────────

  describe('update()', () => {
    it('merges fields and bumps version', async () => {
      const existing = makeCredential({ status: CredentialStatus.ACTIVE });
      const updated = makeCredential({ version: 2 });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      const result = await service.update('cred-1', 'ws-1', { fields: { apiKey: 'NEWKEY' } }, 'user-1');
      expect(repo.update).toHaveBeenCalledWith('cred-1', 'ws-1', expect.objectContaining({ version: 2 }));
      expect(result.version).toBe(2);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.UPDATED }));
    });

    it('throws BadRequest for revoked credential', async () => {
      repo.findById.mockResolvedValue(makeCredential({ status: CredentialStatus.REVOKED }));
      await expect(service.update('cred-1', 'ws-1', { credentialSetName: 'New' })).rejects.toThrow(BadRequestException);
    });
  });

  // ── Status Transitions ────────────────────────────────────

  describe('enable()', () => {
    it('transitions PENDING_VALIDATION → ACTIVE', async () => {
      const existing = makeCredential({ status: CredentialStatus.PENDING_VALIDATION });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: CredentialStatus.ACTIVE });

      const result = await service.enable('cred-1', 'ws-1', 'user-1');
      expect(result.status).toBe(CredentialStatus.ACTIVE);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.ENABLED }));
    });
  });

  describe('disable()', () => {
    it('transitions ACTIVE → DISABLED', async () => {
      const existing = makeCredential({ status: CredentialStatus.ACTIVE });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: CredentialStatus.DISABLED });

      const result = await service.disable('cred-1', 'ws-1');
      expect(result.status).toBe(CredentialStatus.DISABLED);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.DISABLED }));
    });
  });

  describe('revoke()', () => {
    it('transitions ACTIVE → REVOKED', async () => {
      const existing = makeCredential({ status: CredentialStatus.ACTIVE });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: CredentialStatus.REVOKED });

      const result = await service.revoke('cred-1', 'ws-1');
      expect(result.status).toBe(CredentialStatus.REVOKED);
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.REVOKED }));
    });

    it('throws BadRequest for invalid transition', async () => {
      // REVOKED → REVOKED is not allowed
      repo.findById.mockResolvedValue(makeCredential({ status: CredentialStatus.REVOKED }));
      await expect(service.revoke('cred-1', 'ws-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Rotation ──────────────────────────────────────────────

  describe('rotate()', () => {
    it('delegates to rotation service and emits ROTATED event', async () => {
      const existing = makeCredential({ status: CredentialStatus.ACTIVE });
      const result = { credentialId: 'cred-1', previousVersion: 1, newVersion: 2, rotatedAt: new Date() };
      repo.findById.mockResolvedValue(existing);
      rotation.rotate.mockResolvedValue(result);

      const res = await service.rotate('cred-1', 'ws-1', { newFields: { apiKey: 'NEWKEY' } }, 'user-1');
      expect(rotation.rotate).toHaveBeenCalledWith(expect.objectContaining({
        credentialId: 'cred-1',
        workspaceId: 'ws-1',
      }));
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.ROTATED }));
      expect(res.newVersion).toBe(2);
    });
  });

  // ── Validation ────────────────────────────────────────────

  describe('validateById()', () => {
    it('sets status ACTIVE on valid credential', async () => {
      const existing = makeCredential({ status: CredentialStatus.PENDING_VALIDATION });
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: CredentialStatus.ACTIVE, lastValidatedAt: new Date() });

      const result = await service.validateById('cred-1', 'ws-1');
      expect(result.valid).toBe(true);
      expect(repo.update).toHaveBeenCalledWith('cred-1', 'ws-1', expect.objectContaining({ status: CredentialStatus.ACTIVE }));
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.VALIDATED }));
    });

    it('sets status VALIDATION_FAILED on invalid credential', async () => {
      validator.validate.mockReturnValue({ valid: false, errors: [{ field: 'apiKey', message: 'Missing', code: 'MISSING' }], warnings: [], expired: false, missingFields: ['apiKey'] });
      const existing = makeCredential();
      repo.findById.mockResolvedValue(existing);
      repo.update.mockResolvedValue({ ...existing, status: CredentialStatus.VALIDATION_FAILED });

      const result = await service.validateById('cred-1', 'ws-1');
      expect(result.valid).toBe(false);
      expect(repo.update).toHaveBeenCalledWith('cred-1', 'ws-1', expect.objectContaining({ status: CredentialStatus.VALIDATION_FAILED }));
    });
  });

  // ── Cache ─────────────────────────────────────────────────

  describe('resolveActive()', () => {
    it('returns cached credential without hitting repo', async () => {
      const cred = makeCredential({ status: CredentialStatus.ACTIVE });
      cache.get.mockReturnValue(cred);

      const result = await service.resolveActive('AMAZON_SP', 'ws-1');
      expect(result).toBe(cred);
      expect(repo.findActive).not.toHaveBeenCalled();
    });

    it('fetches from repo on cache miss and populates cache', async () => {
      cache.get.mockReturnValue(null);
      const cred = makeCredential({ status: CredentialStatus.ACTIVE });
      repo.findActive.mockResolvedValue(cred);

      const result = await service.resolveActive('AMAZON_SP', 'ws-1');
      expect(repo.findActive).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
      expect(result?.id).toBe('cred-1');
    });

    it('returns null when no active credential exists', async () => {
      cache.get.mockReturnValue(null);
      repo.findActive.mockResolvedValue(null);
      const result = await service.resolveActive('AMAZON_SP', 'ws-1');
      expect(result).toBeNull();
    });
  });

  // ── Security ──────────────────────────────────────────────

  describe('security', () => {
    it('CredentialResponseDto never contains encryptedFields', async () => {
      const raw = makeCredential({ encryptedFields: { apiKey: 'enc:super-secret' } });
      repo.create.mockResolvedValue(raw);

      const response = await service.create('ws-1', { providerKey: 'AMAZON_SP', credentialSetName: 'default', fields: { apiKey: 'KEY' } });
      const responseObj = JSON.parse(JSON.stringify(response));
      expect(responseObj.encryptedFields).toBeUndefined();
      expect(JSON.stringify(responseObj)).not.toContain('super-secret');
    });

    it('workspace isolation: cannot find credential from another workspace', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('cred-1', 'ws-other')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Deletion ──────────────────────────────────────────────

  describe('delete()', () => {
    it('soft-deletes and invalidates cache', async () => {
      repo.findById.mockResolvedValue(makeCredential());
      repo.softDelete.mockResolvedValue(undefined);

      await service.delete('cred-1', 'ws-1');
      expect(repo.softDelete).toHaveBeenCalledWith('cred-1', 'ws-1');
      expect(cache.invalidateById).toHaveBeenCalledWith('cred-1');
      expect(queue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ event: CredentialEvent.DELETED }));
    });
  });
});
