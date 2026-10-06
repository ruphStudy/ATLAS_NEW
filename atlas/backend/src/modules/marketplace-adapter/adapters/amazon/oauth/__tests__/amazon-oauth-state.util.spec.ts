import { AmazonOAuthStateSigner } from '../amazon-oauth-state.util';

describe('AmazonOAuthStateSigner', () => {
  const OLD_ENV = process.env['ATLAS_CREDENTIAL_KEY'];

  beforeAll(() => {
    process.env['ATLAS_CREDENTIAL_KEY'] = 'test-atlas-credential-key-at-least-32-chars-long';
  });

  afterAll(() => {
    process.env['ATLAS_CREDENTIAL_KEY'] = OLD_ENV;
  });

  let signer: AmazonOAuthStateSigner;

  beforeEach(() => {
    signer = new AmazonOAuthStateSigner();
  });

  it('signs and verifies a valid state, carrying workspaceId/userId/country/accountId through untouched', () => {
    const { state } = signer.sign({ workspaceId: 'ws-1', userId: 'user-1', country: 'US', accountId: 'acct-1' });
    const result = signer.verify(state);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.workspaceId).toBe('ws-1');
      expect(result.payload.userId).toBe('user-1');
      expect(result.payload.country).toBe('US');
      expect(result.payload.accountId).toBe('acct-1');
    }
  });

  it('rejects a tampered payload (workspaceId swapped after signing)', () => {
    const { state } = signer.sign({ workspaceId: 'ws-victim', userId: 'user-1', country: 'US' });
    const [encodedPayload, signature] = state.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload!, 'base64url').toString('utf8'));
    payload.workspaceId = 'ws-attacker';
    const tamperedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const tamperedState = `${tamperedPayload}.${signature}`;

    const result = signer.verify(tamperedState);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TAMPERED');
  });

  it('rejects a state with a forged signature', () => {
    const { state } = signer.sign({ workspaceId: 'ws-1', userId: 'user-1', country: 'US' });
    const [encodedPayload] = state.split('.');
    const forged = `${encodedPayload}.${'A'.repeat(43)}`;

    const result = signer.verify(forged);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('TAMPERED');
  });

  it('rejects an expired state', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const { state } = signer.sign({ workspaceId: 'ws-1', userId: 'user-1', country: 'US' });
    nowSpy.mockReturnValue(1_000_000 + 11 * 60 * 1000); // past the 10-minute TTL

    const result = signer.verify(state);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('EXPIRED');
    nowSpy.mockRestore();
  });

  it('rejects a malformed state string', () => {
    expect(signer.verify('not-a-valid-state').valid).toBe(false);
    expect(signer.verify('').valid).toBe(false);
    expect(signer.verify('a.b.c').valid).toBe(false);
  });

  it('produces a different signature for a different ATLAS_CREDENTIAL_KEY (no cross-environment forgery)', () => {
    const { state } = signer.sign({ workspaceId: 'ws-1', userId: 'user-1', country: 'US' });

    process.env['ATLAS_CREDENTIAL_KEY'] = 'a-completely-different-secret-key-at-least-32-chars';
    const otherSigner = new AmazonOAuthStateSigner();
    const result = otherSigner.verify(state);

    expect(result.valid).toBe(false);
    process.env['ATLAS_CREDENTIAL_KEY'] = 'test-atlas-credential-key-at-least-32-chars-long';
  });
});
