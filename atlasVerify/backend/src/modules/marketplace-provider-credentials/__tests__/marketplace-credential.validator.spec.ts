import { MarketplaceCredentialValidator } from '../validator/marketplace-credential.validator';
import { CredentialFieldType, CredentialStatus, CredentialVersionStatus, IMarketplaceProviderCredential, ProviderCredentialSchema } from '../interfaces';
import { MP_CREDENTIAL_ERROR_CODES } from '../constants';

const PLAIN_FIELDS: Record<string, string> = { apiKey: 'AKIAXXXXX', secretKey: 'abc123456' };

const SCHEMA: ProviderCredentialSchema = {
  providerKey: 'AMAZON_SP',
  version: '1',
  fields: [
    { key: 'apiKey', label: 'API Key', type: CredentialFieldType.API_KEY, required: true, sensitive: true, minLength: 5 },
    { key: 'secretKey', label: 'Secret Key', type: CredentialFieldType.SECRET_KEY, required: true, sensitive: true },
    { key: 'sellerId', label: 'Seller ID', type: CredentialFieldType.SELLER_ID, required: false, sensitive: false },
  ],
};

function makeCredential(overrides?: Partial<IMarketplaceProviderCredential>): Partial<IMarketplaceProviderCredential> {
  return {
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    credentialSetName: 'default',
    status: CredentialStatus.ACTIVE,
    ...overrides,
  };
}

describe('MarketplaceCredentialValidator', () => {
  let validator: MarketplaceCredentialValidator;

  beforeEach(() => {
    validator = new MarketplaceCredentialValidator();
  });

  describe('validate()', () => {
    it('passes for valid credential on create', () => {
      const result = validator.validate(
        makeCredential(),
        { providerKey: 'AMAZON_SP', isCreate: true, schema: SCHEMA, plainFields: PLAIN_FIELDS },
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when providerKey is missing on create', () => {
      const result = validator.validate(
        makeCredential(),
        { providerKey: '', isCreate: true },
      );
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === MP_CREDENTIAL_ERROR_CODES.MISSING_REQUIRED_FIELD)).toBe(true);
    });

    it('fails when credentialSetName is missing on create', () => {
      const result = validator.validate(
        { workspaceId: 'ws-1', providerKey: 'P' },
        { providerKey: 'P', isCreate: true },
      );
      expect(result.valid).toBe(false);
    });

    it('fails when workspaceId is missing on create', () => {
      const result = validator.validate(
        { credentialSetName: 'x', providerKey: 'P' },
        { providerKey: 'P', isCreate: true },
      );
      expect(result.valid).toBe(false);
    });

    describe('expiry validation', () => {
      it('fails for expired credentials', () => {
        const past = new Date(Date.now() - 1_000);
        const result = validator.validate(
          makeCredential({ expiresAt: past }),
          { providerKey: 'P' },
        );
        expect(result.valid).toBe(false);
        expect(result.expired).toBe(true);
        expect(result.errors.some((e) => e.code === MP_CREDENTIAL_ERROR_CODES.CREDENTIAL_EXPIRED)).toBe(true);
      });

      it('warns when expiry is approaching', () => {
        const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1_000); // 2 days
        const result = validator.validate(
          makeCredential({ expiresAt: soon }),
          { providerKey: 'P' },
        );
        expect(result.valid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('schema validation', () => {
      it('fails when required field is missing', () => {
        const result = validator.validate(
          makeCredential(),
          { providerKey: 'AMAZON_SP', schema: SCHEMA, plainFields: { secretKey: 'abc123' } },
        );
        expect(result.valid).toBe(false);
        expect(result.missingFields).toContain('apiKey');
      });

      it('fails when field is too short', () => {
        const result = validator.validate(
          makeCredential(),
          { providerKey: 'AMAZON_SP', schema: SCHEMA, plainFields: { apiKey: 'ab', secretKey: 'abc123' } },
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === MP_CREDENTIAL_ERROR_CODES.SCHEMA_VALIDATION_FAILED)).toBe(true);
      });

      it('fails when field does not match pattern', () => {
        const schemaCopy: ProviderCredentialSchema = {
          ...SCHEMA,
          fields: [{ key: 'apiKey', label: 'API Key', type: CredentialFieldType.API_KEY, required: true, sensitive: true, pattern: '^AKIA' }],
        };
        const result = validator.validate(
          makeCredential(),
          { providerKey: 'P', schema: schemaCopy, plainFields: { apiKey: 'WRONGPREFIX' } },
        );
        expect(result.valid).toBe(false);
      });

      it('passes when optional field is absent', () => {
        const result = validator.validate(
          makeCredential(),
          { providerKey: 'AMAZON_SP', schema: SCHEMA, plainFields: PLAIN_FIELDS },
        );
        expect(result.valid).toBe(true);
      });
    });

    describe('field-length guard', () => {
      it('fails when any plain-text field exceeds MAX_FIELD_VALUE_LENGTH', () => {
        const longValue = 'x'.repeat(5_000);
        const result = validator.validate(
          makeCredential(),
          { providerKey: 'P', plainFields: { apiKey: longValue } },
        );
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.code === MP_CREDENTIAL_ERROR_CODES.FIELD_TOO_LONG)).toBe(true);
      });
    });
  });

  describe('validateRequiredFieldKeys()', () => {
    it('returns valid when all required keys are present (even encrypted)', () => {
      const enc = { apiKey: 'v1:iv:tag:data', secretKey: 'v1:iv:tag:data' };
      const result = validator.validateRequiredFieldKeys(SCHEMA, enc);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns missing keys when required fields are absent', () => {
      const enc = { apiKey: 'v1:iv:tag:data' };
      const result = validator.validateRequiredFieldKeys(SCHEMA, enc);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('secretKey');
    });
  });
});
