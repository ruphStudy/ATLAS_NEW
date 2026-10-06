/**
 * ATLAS — Amazon Catalog Items Static Sandbox Verification
 * ----------------------------------------------------------------
 * A trusted, OPERATOR-ONLY script that calls the REAL, existing
 * `AmazonSpApiClient`/`AmazonAuthService` against Amazon's live sandbox
 * endpoint with Amazon's own documented static-sandbox example request
 * for Catalog Items v2022-04-01 `searchCatalogItems` (see
 * `AmazonSandboxHealthService.checkCatalogSearchSandbox()` for the exact
 * canned request). No mocking, no synthetic response.
 *
 * This is NOT an HTTP endpoint and is never imported by, or wired into,
 * the running application. It boots only the minimal, DB/Redis-free
 * provider graph the Amazon sandbox check actually needs (`AdapterHttpClient`,
 * `AmazonAuthService`, `AmazonSpApiClient`, `AmazonSandboxHealthService`,
 * plus the real `ConfigurationModule` for env/credential access) — never
 * the full `AppModule` — so it runs independently of Postgres/Redis
 * availability.
 *
 * Never logs/prints access tokens, refresh tokens, or client secrets —
 * only the request shape actually sent (marketplaceIds/keywords/includedData,
 * none of which are secrets) and Amazon's own response/error.
 *
 * Usage: npm run verify:amazon-catalog-sandbox
 */

import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigurationModule } from '../src/config/configuration.module';
import { AdapterHttpClient } from '../src/modules/marketplace-adapter/client/http.client';
import { AmazonAuthService } from '../src/modules/marketplace-adapter/adapters/amazon/auth/amazon-auth.service';
import { AmazonSpApiClient } from '../src/modules/marketplace-adapter/adapters/amazon/client/amazon-sp-api.client';
import { AmazonSandboxHealthService } from '../src/modules/marketplace-adapter/adapters/amazon/health/amazon-sandbox-health.service';

@Module({
  imports: [ConfigurationModule],
  providers: [AdapterHttpClient, AmazonAuthService, AmazonSpApiClient, AmazonSandboxHealthService],
})
class AmazonCatalogSandboxVerificationModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AmazonCatalogSandboxVerificationModule, {
    logger: false,
  });

  try {
    const healthService = app.get(AmazonSandboxHealthService);
    const result = await healthService.checkCatalogSearchSandbox();

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));

    if (result.status !== 'healthy') {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Amazon catalog sandbox verification script crashed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
