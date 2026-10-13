import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceId, UserId, Public } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { ConfigurationService } from '@config/configuration.service';
import { AmazonOAuthService } from './amazon-oauth.service';
import {
  AmazonAuthorizeResponseDto,
  AmazonOAuthCallbackQueryDto,
  ContinueAmazonLoginUriDto,
  ContinueAmazonLoginUriResponseDto,
  StartAmazonAuthorizationDto,
} from './amazon-oauth.dto';

@Controller({ path: 'marketplace-adapter/amazon/oauth', version: '1' })
export class AmazonOAuthController {
  constructor(
    private readonly oauthService: AmazonOAuthService,
    private readonly configurationService: ConfigurationService,
  ) {}

  // ── Start ─────────────────────────────────────────────────────
  // Tenant-scoped: workspaceId/userId come only from the authenticated
  // session, never from the request body.

  @UseGuards(TenantIsolationGuard)
  @Post('authorize')
  async authorize(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: StartAmazonAuthorizationDto,
  ): Promise<AmazonAuthorizeResponseDto> {
    const result = await this.oauthService.startAuthorization({
      workspaceId,
      userId,
      country: dto.country,
      accountId: dto.accountId,
    });
    return { authorizationUrl: result.authorizationUrl, expiresAt: result.expiresAt };
  }

  // ── Login URI continuation ────────────────────────────────────
  // Called by the frontend /amazon/oauth/login page (Amazon's registered
  // Login URI) once the seller is signed in to ATLAS. Tenant context comes
  // only from the session; the response carries the URL back to Amazon.

  @UseGuards(TenantIsolationGuard)
  @Post('login-continue')
  @HttpCode(HttpStatus.OK)
  async continueLoginUri(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ContinueAmazonLoginUriDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ContinueAmazonLoginUriResponseDto> {
    res.setHeader('Referrer-Policy', 'no-referrer');
    return this.oauthService.continueLoginUri({ workspaceId, userId, ...dto });
  }

  // ── Callback ──────────────────────────────────────────────────
  // Public: Amazon redirects the seller's browser here directly, with no
  // ATLAS session. All tenant context comes from the validated `state`
  // value alone — query params are never trusted for workspaceId/userId.

  @Public()
  @Get('callback')
  async callback(@Query() query: AmazonOAuthCallbackQueryDto, @Res() res: Response): Promise<void> {
    const result = await this.oauthService.handleCallback({
      state: query.state,
      code: query.spapi_oauth_code,
      sellingPartnerId: query.selling_partner_id,
      error: query.error,
    });

    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(this.buildRedirectUrl(result.success, result.reason));
  }

  private buildRedirectUrl(success: boolean, reason?: string): string {
    const frontendOrigin = this.configurationService.getAppConfig().corsOrigins[0] ?? 'http://localhost:3000';
    const url = new URL('/marketplace-accounts', frontendOrigin);
    url.searchParams.set('amazon', success ? 'connected' : 'error');
    if (!success && reason) {
      url.searchParams.set('reason', reason);
    }
    return url.toString();
  }
}
