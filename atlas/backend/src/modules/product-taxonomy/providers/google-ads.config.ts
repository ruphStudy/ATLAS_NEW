/**
 * Google Ads API (Keyword Planner) config boundary.
 *
 * No credentials exist anywhere in this codebase today (verified: no
 * GOOGLE_ADS_* env vars, no google-ads client dependency, no prior
 * integration). Kept self-contained here rather than wired into the
 * shared ConfigurationService/environment.validation.ts, since this
 * provider is inert until a human actually sets these up — see the
 * exact setup this returns via `describeMissingConfig()`.
 *
 * To activate real search-demand validation, an operator must provide
 * ALL of:
 *   GOOGLE_ADS_DEVELOPER_TOKEN     — issued by Google Ads once the
 *                                    developer-token application is approved
 *   GOOGLE_ADS_CLIENT_ID           — OAuth2 client (Google Cloud project)
 *   GOOGLE_ADS_CLIENT_SECRET       — OAuth2 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN       — obtained via a one-time OAuth consent
 *                                    flow for a Google Ads Manager account
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   — the Manager (MCC) account ID the
 *                                    developer token is issued under
 * Then a real `google-ads-api` (or equivalent) client call replaces the
 * `throw` in GoogleSearchDemandProvider.getSearchDemandEvidence().
 */
export interface IGoogleAdsConfig {
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  loginCustomerId?: string;
}

const REQUIRED_ENV_KEYS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
] as const;

export function getGoogleAdsConfig(): IGoogleAdsConfig {
  return {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || undefined,
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || undefined,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || undefined,
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || undefined,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  };
}

export function isGoogleAdsConfigured(config: IGoogleAdsConfig = getGoogleAdsConfig()): boolean {
  return REQUIRED_ENV_KEYS.every((key) => !!process.env[key]) && Object.values(config).every(Boolean);
}

export function describeMissingGoogleAdsConfig(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
}
