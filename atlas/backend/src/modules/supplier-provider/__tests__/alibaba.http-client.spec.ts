import { AlibabaHttpClient, AlibabaHttpError } from '../alibaba/alibaba.http-client';
import { ProviderErrorCode } from '../../../interfaces';

// ── Mock fetch ────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeClient(overrides: { baseUrl?: string; appKey?: string; appSecret?: string; accessToken?: string } = {}): AlibabaHttpClient {
  return new AlibabaHttpClient(
    overrides.baseUrl ?? 'https://eco.taobao.com/router/rest',
    overrides.appKey ?? 'test_app_key',
    overrides.appSecret ?? 'test_secret',
    overrides.accessToken ?? 'test_access_token',
    null,
  );
}

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

afterEach(() => jest.clearAllMocks());

// ── Request Signing ───────────────────────────────────────────

describe('AlibabaHttpClient – request signing', () => {
  it('sends POST with form-encoded body', async () => {
    mockFetch.mockResolvedValue(mockResponse({ result: { result_list: [] } }));
    const client = makeClient();
    await client.request({ method: 'alibaba.icbu.product.list', params: { keywords: 'steel' } });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('eco.taobao.com');
    expect(init.method).toBe('POST');
    expect(init.headers?.['Content-Type']).toContain('application/x-www-form-urlencoded');
    expect(String(init.body)).toContain('method=alibaba.icbu.product.list');
  });

  it('includes sign in request body', async () => {
    mockFetch.mockResolvedValue(mockResponse({ result: {} }));
    await makeClient().request({ method: 'test.method' });
    const body = String(mockFetch.mock.calls[0][1].body);
    expect(body).toContain('sign=');
  });

  it('does not expose appSecret or accessToken in URL', async () => {
    mockFetch.mockResolvedValue(mockResponse({ result: {} }));
    await makeClient({ appSecret: 'SUPER_SECRET', accessToken: 'MY_TOKEN' }).request({ method: 'test.method' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain('SUPER_SECRET');
    expect(url).not.toContain('MY_TOKEN');
  });

  it('includes session in request body (not URL)', async () => {
    mockFetch.mockResolvedValue(mockResponse({ result: {} }));
    await makeClient({ accessToken: 'MY_TOKEN' }).request({ method: 'test.method' });
    const body = String(mockFetch.mock.calls[0][1].body);
    expect(body).toContain('session=MY_TOKEN');
  });
});

// ── HTTP Error Mapping ────────────────────────────────────────

describe('AlibabaHttpClient – HTTP error mapping', () => {
  it('throws AUTH_FAILED on 401', async () => {
    mockFetch.mockResolvedValue(mockResponse({}, 401));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.AUTH_FAILED,
      httpStatus: 401,
    });
  });

  it('throws NOT_FOUND on 404', async () => {
    mockFetch.mockResolvedValue(mockResponse({}, 404));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.NOT_FOUND,
    });
  });

  it('throws RATE_LIMITED on 429', async () => {
    mockFetch.mockResolvedValue(mockResponse({}, 429));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.RATE_LIMITED,
    });
  });

  it('throws PROVIDER_UNAVAILABLE on 500', async () => {
    mockFetch.mockResolvedValue(mockResponse({}, 500));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.PROVIDER_UNAVAILABLE,
    });
  });
});

// ── Envelope Error Mapping ────────────────────────────────────

describe('AlibabaHttpClient – envelope error mapping', () => {
  it('throws AUTH_FAILED for invalid-sessionkey sub_code', async () => {
    mockFetch.mockResolvedValue(mockResponse({
      error_response: { code: 27, msg: 'Invalid session', sub_code: 'invalid-sessionkey' },
    }));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.AUTH_FAILED,
    });
  });

  it('throws RATE_LIMITED for rate-limit-exceeded sub_code', async () => {
    mockFetch.mockResolvedValue(mockResponse({
      error_response: { code: 9, msg: 'Rate limit', sub_code: 'rate-limit-exceeded' },
    }));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.RATE_LIMITED,
    });
  });

  it('throws INVALID_REQUEST for invalid-parameter sub_code', async () => {
    mockFetch.mockResolvedValue(mockResponse({
      error_response: { code: 27, msg: 'Bad param', sub_code: 'invalid-parameter' },
    }));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.INVALID_REQUEST,
    });
  });

  it('succeeds when no error_response present', async () => {
    mockFetch.mockResolvedValue(mockResponse({ result: { result_list: [{ product_id: 'P1' }] } }));
    const result = await makeClient().request({ method: 'test' });
    expect(result.error_response).toBeUndefined();
    expect(result.result?.result_list).toHaveLength(1);
  });
});

// ── Network / Parse Errors ────────────────────────────────────

describe('AlibabaHttpClient – network & parse errors', () => {
  it('throws NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('econnrefused'));
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.NETWORK_ERROR,
    });
  });

  it('throws TIMEOUT on AbortError', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    mockFetch.mockRejectedValue(abortErr);
    await expect(makeClient().request({ method: 'test', timeoutMs: 1 })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.TIMEOUT,
    });
  });

  it('throws PARSE_ERROR on non-JSON response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not-json'),
    } as Response);
    await expect(makeClient().request({ method: 'test' })).rejects.toMatchObject({
      errorCode: ProviderErrorCode.PARSE_ERROR,
    });
  });
});

// ── Token Refresh ─────────────────────────────────────────────

describe('AlibabaHttpClient – token refresh', () => {
  it('throws AUTH_FAILED when no refresh token', async () => {
    const client = makeClient();
    await expect(client.refreshAccessToken()).rejects.toMatchObject({
      errorCode: ProviderErrorCode.AUTH_FAILED,
    });
  });

  it('updates access token on successful refresh', async () => {
    const client = new AlibabaHttpClient(
      'https://eco.taobao.com/router/rest',
      'key',
      'secret',
      'old_token',
      'refresh_token_abc',
    );

    mockFetch.mockResolvedValue(mockResponse({
      top_auth_token_refresh_response: {
        access_token: 'new_access',
        refresh_token: 'new_refresh',
        expire_time: 9999999999,
      },
    }));

    const result = await client.refreshAccessToken();
    expect(result.access_token).toBe('new_access');
    expect(client.getAccessToken()).toBe('new_access');
    expect(client.getRefreshToken()).toBe('new_refresh');
  });

  it('throws AUTH_FAILED when refresh response has no access_token', async () => {
    const client = new AlibabaHttpClient(
      'https://eco.taobao.com/router/rest',
      'key',
      'secret',
      'old_token',
      'refresh_abc',
    );
    mockFetch.mockResolvedValue(mockResponse({ top_auth_token_refresh_response: { expire_time: 9999 } }));
    await expect(client.refreshAccessToken()).rejects.toMatchObject({
      errorCode: ProviderErrorCode.AUTH_FAILED,
    });
  });
});
