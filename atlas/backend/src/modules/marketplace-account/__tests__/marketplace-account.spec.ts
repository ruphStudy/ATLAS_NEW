import { AccountValidator } from '../validator/account.validator';
import { AccountStatusManager } from '../status/account-status.manager';
import { AccountStatus, IMarketplaceAccount } from '../interfaces';

// ── AccountValidator ──────────────────────────────────────────

describe('AccountValidator', () => {
  let validator: AccountValidator;

  beforeEach(() => { validator = new AccountValidator(); });

  it('passes with all required fields', () => {
    const r = validator.validate({
      workspaceId: 'ws-1',
      providerKey: 'AMAZON_SP',
      marketplaceKey: 'AMAZON_IN',
      accountName: 'My Account',
      externalAccountId: 'ext-123',
    });
    expect(r.valid).toBe(true);
  });

  it('fails when workspaceId missing', () => {
    const r = validator.validate({ workspaceId: '', providerKey: 'AMAZON_SP', marketplaceKey: 'AMAZON_IN', accountName: 'A', externalAccountId: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('workspaceId')]));
  });

  it('fails when providerKey missing', () => {
    const r = validator.validate({ workspaceId: 'ws', providerKey: '', marketplaceKey: 'AMAZON_IN', accountName: 'A', externalAccountId: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('providerKey')]));
  });

  it('fails when marketplaceKey missing', () => {
    const r = validator.validate({ workspaceId: 'ws', providerKey: 'P', marketplaceKey: '', accountName: 'A', externalAccountId: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('marketplaceKey')]));
  });

  it('fails when accountName missing', () => {
    const r = validator.validate({ workspaceId: 'ws', providerKey: 'P', marketplaceKey: 'M', accountName: '', externalAccountId: 'x' });
    expect(r.valid).toBe(false);
  });

  it('fails when externalAccountId missing', () => {
    const r = validator.validate({ workspaceId: 'ws', providerKey: 'P', marketplaceKey: 'M', accountName: 'A', externalAccountId: '' });
    expect(r.valid).toBe(false);
  });

  it('fails when accountName exceeds max length', () => {
    const r = validator.validate({
      workspaceId: 'ws', providerKey: 'P', marketplaceKey: 'M',
      accountName: 'A'.repeat(201), externalAccountId: 'x',
    });
    expect(r.valid).toBe(false);
  });

  it('fails when priority out of range', () => {
    const r = validator.validate({
      workspaceId: 'ws', providerKey: 'P', marketplaceKey: 'M',
      accountName: 'A', externalAccountId: 'x', priority: -1,
    });
    expect(r.valid).toBe(false);
  });

  it('passes with priority in range', () => {
    const r = validator.validate({
      workspaceId: 'ws', providerKey: 'P', marketplaceKey: 'M',
      accountName: 'A', externalAccountId: 'x', priority: 100,
    });
    expect(r.valid).toBe(true);
  });

  // validateUpdate
  it('validateUpdate passes with valid accountName', () => {
    const r = validator.validateUpdate({ accountName: 'New Name' });
    expect(r.valid).toBe(true);
  });

  it('validateUpdate fails with empty accountName', () => {
    const r = validator.validateUpdate({ accountName: '' });
    expect(r.valid).toBe(false);
  });

  it('validateUpdate passes with no fields', () => {
    const r = validator.validateUpdate({});
    expect(r.valid).toBe(true);
  });
});

// ── AccountStatusManager ──────────────────────────────────────

describe('AccountStatusManager', () => {
  let mgr: AccountStatusManager;

  beforeEach(() => { mgr = new AccountStatusManager(); });

  it('DRAFT → PENDING_VALIDATION is allowed', () => {
    expect(mgr.canTransition(AccountStatus.DRAFT, AccountStatus.PENDING_VALIDATION)).toBe(true);
  });

  it('DRAFT → ACTIVE is not directly allowed', () => {
    expect(mgr.canTransition(AccountStatus.DRAFT, AccountStatus.ACTIVE)).toBe(false);
  });

  it('PENDING_VALIDATION → ACTIVE is allowed', () => {
    expect(mgr.canTransition(AccountStatus.PENDING_VALIDATION, AccountStatus.ACTIVE)).toBe(true);
  });

  it('PENDING_VALIDATION → INVALID is allowed', () => {
    expect(mgr.canTransition(AccountStatus.PENDING_VALIDATION, AccountStatus.INVALID)).toBe(true);
  });

  it('ACTIVE → DISABLED is allowed', () => {
    expect(mgr.canTransition(AccountStatus.ACTIVE, AccountStatus.DISABLED)).toBe(true);
  });

  it('ACTIVE → ARCHIVED is allowed', () => {
    expect(mgr.canTransition(AccountStatus.ACTIVE, AccountStatus.ARCHIVED)).toBe(true);
  });

  it('ARCHIVED → DRAFT (restore) is allowed', () => {
    expect(mgr.canTransition(AccountStatus.ARCHIVED, AccountStatus.DRAFT)).toBe(true);
  });

  it('ARCHIVED → ACTIVE is not allowed', () => {
    expect(mgr.canTransition(AccountStatus.ARCHIVED, AccountStatus.ACTIVE)).toBe(false);
  });

  it('assertTransition throws on invalid transition', () => {
    expect(() => mgr.assertTransition(AccountStatus.ACTIVE, AccountStatus.DRAFT)).toThrow();
  });

  it('assertTransition does not throw on valid transition', () => {
    expect(() => mgr.assertTransition(AccountStatus.ACTIVE, AccountStatus.DISABLED)).not.toThrow();
  });

  it('isMutable returns true for DRAFT', () => {
    expect(mgr.isMutable(AccountStatus.DRAFT)).toBe(true);
  });

  it('isMutable returns false for ACTIVE', () => {
    expect(mgr.isMutable(AccountStatus.ACTIVE)).toBe(false);
  });

  it('isActive returns true for ACTIVE', () => {
    expect(mgr.isActive(AccountStatus.ACTIVE)).toBe(true);
  });

  it('isActive returns false for DISABLED', () => {
    expect(mgr.isActive(AccountStatus.DISABLED)).toBe(false);
  });

  it('assertMutable throws for ACTIVE account', () => {
    const account = { id: 'a', status: AccountStatus.ACTIVE } as IMarketplaceAccount;
    expect(() => mgr.assertMutable(account)).toThrow();
  });

  it('assertMutable does not throw for DRAFT account', () => {
    const account = { id: 'a', status: AccountStatus.DRAFT } as IMarketplaceAccount;
    expect(() => mgr.assertMutable(account)).not.toThrow();
  });
});
