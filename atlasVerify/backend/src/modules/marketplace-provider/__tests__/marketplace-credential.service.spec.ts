import { MarketplaceCredentialService } from '../credentials/marketplace-credential.service';
import {
  MarketplaceCredentialEncryption,
  MarketplaceCredentialType,
  MarketplaceCredentials,
} from '../interfaces';

function makeCreds(fields: Record<string, string> = { apiKey: 'test-key' }): MarketplaceCredentials {
  return {
    workspaceId: 'ws-test',
    providerKey: 'AMAZON_SP',
    credentialType: MarketplaceCredentialType.API_KEY,
    encryptionAlgorithm: MarketplaceCredentialEncryption.NONE,
    fields,
  };
}

describe('MarketplaceCredentialService', () => {
  let service: MarketplaceCredentialService;

  beforeEach(() => {
    process.env['ATLAS_CREDENTIAL_KEY'] = 'test-secret-key-for-unit-tests-only';
    service = new MarketplaceCredentialService();
  });

  describe('encrypt / decrypt', () => {
    it('encrypts and decrypts a value correctly', () => {
      const encrypted = service.encrypt('my-api-key', 'ws1', 'AMAZON_SP');
      const decrypted = service.decrypt(encrypted, 'ws1', 'AMAZON_SP');
      expect(decrypted).toBe('my-api-key');
    });

    it('encrypts differently each time (IV randomness)', () => {
      const enc1 = service.encrypt('same-value', 'ws1', 'AMAZON_SP');
      const enc2 = service.encrypt('same-value', 'ws1', 'AMAZON_SP');
      expect(enc1).not.toBe(enc2);
    });

    it('fails to decrypt with wrong workspace', () => {
      const encrypted = service.encrypt('my-secret', 'ws1', 'AMAZON_SP');
      expect(() => service.decrypt(encrypted, 'ws2', 'AMAZON_SP')).toThrow();
    });

    it('fails to decrypt with wrong provider', () => {
      const encrypted = service.encrypt('my-secret', 'ws1', 'AMAZON_SP');
      expect(() => service.decrypt(encrypted, 'ws1', 'FLIPKART_SP')).toThrow();
    });

    it('throws on malformed encrypted format', () => {
      expect(() => service.decrypt('bad-format', 'ws1', 'AMAZON_SP')).toThrow(
        'Invalid encrypted credential format',
      );
    });
  });

  describe('encryptFields / decryptCredentials', () => {
    it('encrypts all fields and decrypts them back', () => {
      const raw = { apiKey: 'key1', secretKey: 'secret1' };
      const encrypted = service.encryptFields(raw, 'ws1', 'AMAZON_SP');

      const creds: MarketplaceCredentials = {
        workspaceId: 'ws1',
        providerKey: 'AMAZON_SP',
        credentialType: MarketplaceCredentialType.API_KEY,
        encryptionAlgorithm: MarketplaceCredentialEncryption.AES_256_GCM,
        fields: encrypted,
      };

      const decrypted = service.decryptCredentials(creds);
      expect(decrypted['apiKey']).toBe('key1');
      expect(decrypted['secretKey']).toBe('secret1');
    });

    it('returns fields as-is for NONE encryption', () => {
      const creds = makeCreds({ apiKey: 'plain-key' });
      const decrypted = service.decryptCredentials(creds);
      expect(decrypted['apiKey']).toBe('plain-key');
    });
  });

  describe('validateRequiredFields', () => {
    it('passes when all required fields are present', () => {
      const result = service.validateRequiredFields(
        { apiKey: 'val', secret: 'sec' },
        ['apiKey', 'secret'],
      );
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('fails when a required field is missing', () => {
      const result = service.validateRequiredFields({ apiKey: 'val' }, ['apiKey', 'secret']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('secret');
    });

    it('fails when a required field is empty string', () => {
      const result = service.validateRequiredFields({ apiKey: '' }, ['apiKey']);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateCredentials()', () => {
    it('returns valid=true for non-expired creds with all required fields', () => {
      const creds = makeCreds({ apiKey: 'key' });
      const result = service.validateCredentials(creds, ['apiKey']);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
    });

    it('returns valid=false for expired creds', () => {
      const creds: MarketplaceCredentials = {
        ...makeCreds({ apiKey: 'key' }),
        expiresAt: new Date(Date.now() - 1000),
      };
      const result = service.validateCredentials(creds, ['apiKey']);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('returns valid=false for missing required fields', () => {
      const creds = makeCreds({ apiKey: 'key' });
      const result = service.validateCredentials(creds, ['apiKey', 'secret']);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('secret');
    });
  });

  describe('maskForLog()', () => {
    it('masks all field values', () => {
      const masked = service.maskForLog({ apiKey: 'real-key', secret: 'real-secret' });
      expect(masked['apiKey']).toBe('***MASKED***');
      expect(masked['secret']).toBe('***MASKED***');
    });
  });

  describe('isApproachingExpiry()', () => {
    it('returns true when expiry within window', () => {
      const creds: MarketplaceCredentials = {
        ...makeCreds(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
      };
      expect(service.isApproachingExpiry(creds, 60 * 60 * 1000)).toBe(true); // 1 hour window
    });

    it('returns false when well before expiry', () => {
      const creds: MarketplaceCredentials = {
        ...makeCreds(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      };
      expect(service.isApproachingExpiry(creds, 60 * 60 * 1000)).toBe(false);
    });

    it('returns false when no expiry set', () => {
      expect(service.isApproachingExpiry(makeCreds())).toBe(false);
    });
  });
});
