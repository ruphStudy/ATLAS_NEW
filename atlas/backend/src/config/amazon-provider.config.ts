import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { AmazonSpApiEnvironment, IAmazonProviderConfig } from './interfaces';

/**
 * Amazon SP-API global app-level configuration: ATLAS's own SP-API
 * application clientId/clientSecret (one pair for the whole deployment,
 * shared across every workspace/seller account) plus which SP-API
 * environment (sandbox|production) to call.
 *
 * Per-seller refreshToken/sellerId are deliberately NOT here — they are
 * resolved per workspace/account via marketplace-provider-credentials
 * and marketplace-account, then combined with this global config at
 * runtime inside the Amazon adapter (see amazon-credentials.composer.ts).
 */
export const amazonProviderConfig = registerAs(
  CONFIG_NAMESPACES.AMAZON_PROVIDER,
  (): IAmazonProviderConfig => {
    const clientId = process.env[ENV_KEYS.AMAZON_SP_API_CLIENT_ID];
    const clientSecret = process.env[ENV_KEYS.AMAZON_SP_API_CLIENT_SECRET];
    const applicationId = process.env[ENV_KEYS.AMAZON_SP_API_APPLICATION_ID];
    const redirectUri = process.env[ENV_KEYS.AMAZON_SP_API_REDIRECT_URI];
    const sandboxRefreshToken = process.env[ENV_KEYS.AMAZON_SP_API_SANDBOX_REFRESH_TOKEN];
    // Unset → default (true: current Draft-app behavior). Set to 'false' once the app is published.
    const betaEnv = process.env[ENV_KEYS.AMAZON_SP_API_AUTH_VERSION_BETA];
    const useBetaAuthVersion = betaEnv ? betaEnv === 'true' : CONFIG_DEFAULTS.AMAZON_SP_API_AUTH_VERSION_BETA;
    const environment =
      (process.env[ENV_KEYS.AMAZON_SP_API_ENVIRONMENT] as AmazonSpApiEnvironment | undefined) ??
      (CONFIG_DEFAULTS.AMAZON_SP_API_ENVIRONMENT as AmazonSpApiEnvironment);

    if (!clientId || !clientSecret) {
      new Logger('AmazonProviderConfig').warn(
        'AMAZON_SP_API_CLIENT_ID / AMAZON_SP_API_CLIENT_SECRET are not set. ' +
          'Amazon SP-API calls will fail until both are configured — no fallback value is used.',
      );
    }
    if (!applicationId || !redirectUri) {
      new Logger('AmazonProviderConfig').warn(
        'AMAZON_SP_API_APPLICATION_ID / AMAZON_SP_API_REDIRECT_URI are not set. ' +
          'Connect Amazon (OAuth authorization) will fail until both are configured — no fallback value is used.',
      );
    }
    if (environment === 'sandbox' && !sandboxRefreshToken) {
      new Logger('AmazonProviderConfig').warn(
        'AMAZON_SP_API_SANDBOX_REFRESH_TOKEN is not set. ' +
          'The global Amazon sandbox connectivity check will fail until it is configured — no fallback value is used.',
      );
    }

    return {
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      applicationId: applicationId || undefined,
      redirectUri: redirectUri || undefined,
      useBetaAuthVersion,
      sandboxRefreshToken: sandboxRefreshToken || undefined,
      environment,
    };
  },
);
