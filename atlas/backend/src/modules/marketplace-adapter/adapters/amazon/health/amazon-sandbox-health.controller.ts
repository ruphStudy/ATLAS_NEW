import { Controller, Post, UseGuards } from '@nestjs/common';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { AmazonSandboxHealthService, AmazonSandboxHealthResult } from './amazon-sandbox-health.service';

/**
 * Platform-admin-only: verifies ATLAS's global Amazon SP-API sandbox
 * configuration (clientId/clientSecret/sandbox refresh token) with zero
 * dependency on any workspace, MarketplaceAccount, or seller OAuth.
 * Never called automatically — only on explicit platform-admin request.
 */
@Controller({ path: 'marketplace-adapter/amazon/sandbox-health', version: '1' })
export class AmazonSandboxHealthController {
  constructor(private readonly service: AmazonSandboxHealthService) {}

  @UseGuards(PlatformAdminGuard)
  @Post('check')
  async check(): Promise<AmazonSandboxHealthResult> {
    return this.service.checkSandboxConnectivity();
  }
}
