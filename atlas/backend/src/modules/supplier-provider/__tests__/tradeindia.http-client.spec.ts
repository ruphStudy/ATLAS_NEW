import { TradeIndiaHttpClient, TradeIndiaHttpError } from '../adapters/providers/tradeindia/tradeindia.http-client';
import { ProviderErrorCode } from '../interfaces';

const BASE_URL = 'https://www.tradeindia.com';
const API_KEY = 'TI_TEST_API_KEY';
const USER_ID = 'TI_USER_123';

// ── Helpers ───────────────────────────────────────────────────

function makeClient(apiKey = API_KEY, userId?: string): TradeIndiaHttpClient {
  return new TradeIndiaHttpClient(BASE_URL, apiKey, userId ?? null);
}

function mockFetch(
  responseBody: unknown,
  status = 200,
  ok = true,
): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(responseBody),
    text: () => Promise.resolve(JSON.stringify(responseBody)),
  } as unknown as Response);
}

function mockFetchNetworkError(message: string): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error(message));
}

function mockFetchAbort(): jest.SpyInstance {
  const err = new Error('AbortError');
  err.name = 'AbortError';
  return jest.spyOn(global, 'fetch').mockRejectedValueOnce(err);
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Header Injection ──────────────────────────────────────────

describe('TradeIndiaHttpClient – headers', () => {
  it('injects X-Api-Key header', async () => {
    mockFetch({ STATUS: 'success', DATA: {} });
    const capturedInit: RequestInit[] = [];
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce((_url, init) => {
        capturedInit.push(init as RequestInit);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ STATUS: 'success', DATA: {} }),
          text: () => Promise.resolve('{}'),
        } as Response);
      });

    const client = makeClient();
    await client.request({ path: '/api/v1/products/search', method: 'GET', params: {} });
    const headers = capturedInit[0]!.headers as Record<string, string>;
    expect(headers['X-Api-Key']).toBe(API_KEY);
  });

  it('injects X-User-Id when userId is provided', async () => {
    const capturedInit: RequestInit[] = [];
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce((_url, init) => {
        capturedInit.push(init as RequestInit);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ STATUS: 'success', DATA: {} }),
          text: () => Promise.resolve('{}'),
        } as Response);
      });

    const client = makeClient(API_KEY, USER_ID);
    await client.request({ path: '/api/v1/suppliers/search', method: 'GET', params: {} });
    const headers = capturedInit[0]!.headers as Record<string, string>;
    expect(headers['X-User-Id']).toBe(USER_ID);
  });

  it('omits X-User-Id when userId is not provided', async () => {
    const capturedInit: RequestInit[] = [];
    jest
      .spyOn(global, 'fetch')
      .mockImplementationOnce((_url, init) => {
        capturedInit.push(init as RequestInit);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ STATUS: 'success', DATA: {} }),
          text: () => Promise.resolve('{}'),
        } as Response);
      });

    const client = makeClient(API_KEY); // no userId
    await client.request({ path: '/api/v1/products/search', method: 'GET', params: {} });
    const headers = capturedInit[0]!.headers as Record<string, string>;
    expect(headers['X-User-Id']).toBeUndefined();
  });
});

// ── Successful Response ───────────────────────────────────────

describe('TradeIndiaHttpClient – success', () => {
  it('returns parsed DATA body', async () => {
    const payload = { STATUS: 'success', DATA: { SELLER_ID: 'S1', COMPANY_NAME: 'Test Co' } };
    mockFetch(payload);
    const client = makeClient();
    const result = await client.request({ path: '/api/v1/suppliers/detail', method: 'GET', params: { id: 'S1' } });
    expect(result).toEqual(payload);
  });

  it('appends query params to URL for GET requests', async () => {
    let capturedUrl = '';
    jest.spyOn(global, 'fetch').mockImplementationOnce((url, _init) => {
      capturedUrl = url as string;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ STATUS: 'success', DATA: [] }),
      } as Response);
    });
    const client = makeClient();
    await client.request({
      path: '/api/v1/products/search',
      method: 'GET',
      params: { keyword: 'iron', page: 2 },
    });
    expect(capturedUrl).toContain('keyword=iron');
    expect(capturedUrl).toContain('page=2');
  });
});

// ── HTTP Error Mapping ────────────────────────────────────────

describe('TradeIndiaHttpClient – HTTP errors', () => {
  const cases: [number, ProviderErrorCode][] = [
    [401, ProviderErrorCode.AUTH_FAILED],
    [403, ProviderErrorCode.AUTH_FAILED],
    [404, ProviderErrorCode.NOT_FOUND],
    [429, ProviderErrorCode.RATE_LIMITED],
    [500, ProviderErrorCode.PROVIDER_UNAVAILABLE],
    [503, ProviderErrorCode.PROVIDER_UNAVAILABLE],
  ];
  it.each(cases)('HTTP %i → %s', async (httpStatus, expectedCode) => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: httpStatus,
      text: () => Promise.resolve('error body'),
    } as unknown as Response);
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toMatchObject({ code: expectedCode, httpStatus });
  });

  it('throws TradeIndiaHttpError instance for HTTP errors', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as unknown as Response);
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toBeInstanceOf(TradeIndiaHttpError);
  });
});

// ── Envelope Error ────────────────────────────────────────────

describe('TradeIndiaHttpClient – envelope error', () => {
  it('throws on STATUS=error in envelope', async () => {
    mockFetch({ STATUS: 'error', MESSAGE: 'Something went wrong', DATA: null });
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toThrow(/Something went wrong/);
  });

  it('throws on status=fail in envelope (lowercase)', async () => {
    mockFetch({ status: 'fail', message: 'Validation failure', data: null });
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/suppliers/detail', method: 'GET', params: {} }),
    ).rejects.toBeInstanceOf(TradeIndiaHttpError);
  });
});

// ── Network Error ─────────────────────────────────────────────

describe('TradeIndiaHttpClient – network error', () => {
  it('throws NETWORK_ERROR on fetch rejection', async () => {
    mockFetchNetworkError('econnrefused');
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toMatchObject({ code: ProviderErrorCode.NETWORK_ERROR });
  });
});

// ── Timeout / AbortError ──────────────────────────────────────

describe('TradeIndiaHttpClient – timeout', () => {
  it('throws TIMEOUT on AbortError', async () => {
    mockFetchAbort();
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toMatchObject({ code: ProviderErrorCode.TIMEOUT });
  });
});

// ── Parse Error ───────────────────────────────────────────────

describe('TradeIndiaHttpClient – parse error', () => {
  it('throws PARSE_ERROR when JSON is malformed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
      text: () => Promise.resolve('not json'),
    } as unknown as Response);
    const client = makeClient();
    await expect(
      client.request({ path: '/api/v1/products/search', method: 'GET', params: {} }),
    ).rejects.toMatchObject({ code: ProviderErrorCode.PARSE_ERROR });
  });
});

// ── TradeIndiaHttpError fields ────────────────────────────────

describe('TradeIndiaHttpError', () => {
  it('exposes code and httpStatus', () => {
    const err = new TradeIndiaHttpError(ProviderErrorCode.NOT_FOUND, 'Not found', 404);
    expect(err.errorCode).toBe(ProviderErrorCode.NOT_FOUND);
    expect(err.httpStatus).toBe(404);
    expect(err.message).toContain('Not found');
    expect(err).toBeInstanceOf(Error);
  });
});
