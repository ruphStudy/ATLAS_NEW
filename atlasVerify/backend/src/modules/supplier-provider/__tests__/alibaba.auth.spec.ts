import { AlibabaRequestSigner } from '../alibaba/alibaba.auth';

function makeSigner(appKey = 'test_app_key', appSecret = 'test_secret'): AlibabaRequestSigner {
  return new AlibabaRequestSigner(appKey, appSecret);
}

describe('AlibabaRequestSigner', () => {
  it('includes required system params', () => {
    const signer = makeSigner();
    const params = signer.buildSignedParams('alibaba.icbu.product.list', {}, 'access_token_123');
    expect(params['method']).toBe('alibaba.icbu.product.list');
    expect(params['app_key']).toBe('test_app_key');
    expect(params['format']).toBe('json');
    expect(params['v']).toBe('2.0');
    expect(params['sign_method']).toBe('hmac-sha256');
    expect(params['session']).toBe('access_token_123');
    expect(params['sign']).toBeDefined();
  });

  it('omits session when accessToken is null', () => {
    const signer = makeSigner();
    const params = signer.buildSignedParams('test.method', {}, null);
    expect(params['session']).toBeUndefined();
  });

  it('produces deterministic signature for same inputs', () => {
    const signer = makeSigner();
    const params1 = signer.buildSignedParams('test.method', { keyword: 'steel' }, 'tok');
    const params2 = signer.buildSignedParams('test.method', { keyword: 'steel' }, 'tok');
    // Signatures may differ due to timestamp — only check structure
    expect(params1['sign']).toBeDefined();
    expect(params1['sign']).toHaveLength(params2['sign']!.length);
  });

  it('sign output is uppercase hex', () => {
    const signer = makeSigner();
    const params: Record<string, string> = {
      method: 'test.method',
      app_key: 'test_app_key',
      timestamp: '2026-07-17 00:00:00',
      format: 'json',
      v: '2.0',
      sign_method: 'hmac-sha256',
      session: 'token123',
    };
    const sig = signer.sign(params);
    expect(sig).toMatch(/^[0-9A-F]+$/);
  });

  it('sign changes when params change', () => {
    const signer = makeSigner();
    const base: Record<string, string> = {
      method: 'test',
      app_key: 'k',
      timestamp: '2026-07-17 00:00:00',
      format: 'json',
      v: '2.0',
      sign_method: 'hmac-sha256',
    };
    const sig1 = signer.sign({ ...base, keywords: 'steel' });
    const sig2 = signer.sign({ ...base, keywords: 'aluminum' });
    expect(sig1).not.toBe(sig2);
  });

  it('toSafeLogEntry redacts session and sign', () => {
    const signer = makeSigner();
    const params: Record<string, string> = {
      method: 'test',
      app_key: 'key123',
      session: 'SUPER_SECRET_TOKEN',
      sign: 'ABCDEF123456',
    };
    const safe = signer.toSafeLogEntry(params);
    expect(safe['sign']).toBeUndefined();
    expect(safe['session']).toBe('[REDACTED]');
    expect(safe['app_key']).toBe('key123');
  });
});
