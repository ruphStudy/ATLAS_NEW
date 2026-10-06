import 'reflect-metadata';
import { GoogleSearchDemandProvider } from '../providers/google-search-demand.provider';

const GOOGLE_ADS_ENV_KEYS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
];

describe('GoogleSearchDemandProvider', () => {
  let provider: GoogleSearchDemandProvider;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of GOOGLE_ADS_ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
    provider = new GoogleSearchDemandProvider();
  });

  afterEach(() => {
    for (const key of GOOGLE_ADS_ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('reports not configured when no GOOGLE_ADS_* env vars are set (this repo\'s actual current state)', () => {
    expect(provider.isConfigured()).toBe(false);
  });

  it('returns null (never a fabricated search-volume number) when unconfigured, without making any network call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await provider.getSearchDemandEvidence('smartwatch');

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports configured once all required credentials are present', () => {
    for (const key of GOOGLE_ADS_ENV_KEYS) process.env[key] = 'test-value';

    expect(provider.isConfigured()).toBe(true);
  });

  it('fails loudly rather than silently faking data if credentials exist but the client call is not implemented', async () => {
    for (const key of GOOGLE_ADS_ENV_KEYS) process.env[key] = 'test-value';

    await expect(provider.getSearchDemandEvidence('smartwatch')).rejects.toThrow(
      /not implemented/i,
    );
  });
});
