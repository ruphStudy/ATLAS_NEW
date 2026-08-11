import { MarketplaceCredentialEncryptor } from '../encryptor/marketplace-credential.encryptor';
import { MarketplaceCredentialDecryptor } from '../decryptor/marketplace-credential.decryptor';
import {
  CredentialStatus,
  CredentialVersionStatus,
  IMarketplaceProviderCredential,
} from '../interfaces';
import { MP_CREDENTIAL_CONSTANTS } from '../constants';

const WORKSPACE_ID = 'ws-enc-test';
const PROVIDER_KEY = 'AMAZON_SP';

function makeCredential(overrides?: Partial<IMarketplaceProviderCredential>): IMarketplaceProviderCredential {
  return {
    id: 'cred-1',
    workspaceId: WORKSPACE_ID,
    providerKey: PROVIDER_KEY,
    credentialSetName: 'default',
    status: CredentialStatus.ACTIVE,
    version: 1,
    versionStatus: CredentialVersionStatus.PUBLISHED,
    encryptedFields: {},
    encryptionVersion: 'v1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MarketplaceCredentialEncryptor', () => {
  let encryptor: MarketplaceCredentialEncryptor;

  beforeEach(() => {
    process.env['ATLAS_CREDENTIAL_KEY'] = 'test-secret-key-for-unit-tests';
    encryptor = new MarketplaceCredentialEncryptor();
  });

  describe('encryptField()', () => {
    it('returns a non-empty string', () => {
      const result = encryptor.encryptField('my-api-key', WORKSPACE_ID, PROVIDER_KEY);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns a string with 4 colon-delimited segments (version:iv:authTag:ciphertext)', () => {
      const result = encryptor.encryptField('my-api-key', WORKSPACE_ID, PROVIDER_KEY);
      expect(result.split(':').length).toBe(4);
    });

    it('produces different ciphertexts for the same input (random IV)', () => {
      const a = encryptor.encryptField('same-value', WORKSPACE_ID, PROVIDER_KEY);
      const b = encryptor.encryptField('same-value', WORKSPACE_ID, PROVIDER_KEY);
      expect(a).not.toBe(b);
    });

    it('produces different ciphertexts for different workspaces', () => {
      const a = encryptor.encryptField('value', 'ws-1', PROVIDER_KEY);
      const b = encryptor.encryptField('value', 'ws-2', PROVIDER_KEY);
      expect(a).not.toBe(b);
    });

    it('never exposes the plain-text in the output', () => {
      const result = encryptor.encryptField('super-secret', WORKSPACE_ID, PROVIDER_KEY);
      expect(result).not.toContain('super-secret');
    });
  });

  describe('encryptFields()', () => {
    it('encrypts all keys', () => {
      const plain = { apiKey: 'abc', secretKey: 'xyz' };
      const result = encryptor.encryptFields(plain, WORKSPACE_ID, PROVIDER_KEY);
      expect(Object.keys(result)).toEqual(expect.arrayContaining(['apiKey', 'secretKey']));
      expect(result['apiKey']).not.toBe('abc');
      expect(result['secretKey']).not.toBe('xyz');
    });
  });

  describe('maskFields()', () => {
    it('masks all fields regardless of type', () => {
      const fields = { apiKey: 'abc', secretKey: 'xyz', username: 'user1' };
      const masked = encryptor.maskFields(fields);
      for (const key of Object.keys(fields)) {
        expect(masked[key]).toBe(MP_CREDENTIAL_CONSTANTS.MASK_VALUE);
      }
    });
  });
});

describe('MarketplaceCredentialDecryptor', () => {
  let encryptor: MarketplaceCredentialEncryptor;
  let decryptor: MarketplaceCredentialDecryptor;

  beforeEach(() => {
    process.env['ATLAS_CREDENTIAL_KEY'] = 'test-secret-key-for-unit-tests';
    encryptor = new MarketplaceCredentialEncryptor();
    decryptor = new MarketplaceCredentialDecryptor(encryptor);
  });

  describe('decryptField()', () => {
    it('round-trips correctly', () => {
      const plain = 'my-secret-value';
      const encrypted = encryptor.encryptField(plain, WORKSPACE_ID, PROVIDER_KEY);
      const decrypted = decryptor.decryptField(encrypted, WORKSPACE_ID, PROVIDER_KEY);
      expect(decrypted).toBe(plain);
    });

    it('throws for invalid format (< 4 segments)', () => {
      expect(() => decryptor.decryptField('invalid', WORKSPACE_ID, PROVIDER_KEY)).toThrow();
    });

    it('throws for incorrect workspace key', () => {
      const encrypted = encryptor.encryptField('value', WORKSPACE_ID, PROVIDER_KEY);
      expect(() => decryptor.decryptField(encrypted, 'wrong-workspace', PROVIDER_KEY)).toThrow();
    });

    it('throws for incorrect provider key', () => {
      const encrypted = encryptor.encryptField('value', WORKSPACE_ID, PROVIDER_KEY);
      expect(() => decryptor.decryptField(encrypted, WORKSPACE_ID, 'WRONG_PROVIDER')).toThrow();
    });
  });

  describe('decryptCredential()', () => {
    it('decrypts all fields and returns bag without persisting', () => {
      const fields = { apiKey: 'KEY123', secretKey: 'SECRET456' };
      const encryptedFields = encryptor.encryptFields(fields, WORKSPACE_ID, PROVIDER_KEY);
      const credential = makeCredential({ encryptedFields });

      const bag = decryptor.decryptCredential(credential);
      expect(bag.credentialId).toBe(credential.id);
      expect(bag.workspaceId).toBe(WORKSPACE_ID);
      expect(bag.providerKey).toBe(PROVIDER_KEY);
      expect(bag.fields['apiKey']).toBe('KEY123');
      expect(bag.fields['secretKey']).toBe('SECRET456');
    });
  });

  describe('decryptFields()', () => {
    it('decrypts only specified keys', () => {
      const fields = { apiKey: 'KEY', secretKey: 'SEC', sellerId: 'SID' };
      const encryptedFields = encryptor.encryptFields(fields, WORKSPACE_ID, PROVIDER_KEY);

      const partial = decryptor.decryptFields(encryptedFields, ['apiKey', 'sellerId'], WORKSPACE_ID, PROVIDER_KEY);
      expect(partial['apiKey']).toBe('KEY');
      expect(partial['sellerId']).toBe('SID');
      expect(partial['secretKey']).toBeUndefined();
    });
  });
});
