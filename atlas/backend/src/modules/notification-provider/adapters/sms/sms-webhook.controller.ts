import { Controller, Post, Body, Param, Req, Headers, HttpCode, HttpStatus, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@modules/authentication/decorators/public.decorator';
import { SmsWebhookService, ISmsCallbackResult } from './sms-webhook.service';

/**
 * Inbound SMS delivery-receipt/status-callback endpoint. Public (no JWT) —
 * an external SMS vendor cannot authenticate as an ATLAS user — with
 * workspace/provider context taken from the URL path (configured as this
 * route at credential-setup time), never from the untrusted vendor body.
 * Vendor authenticity is instead established via HMAC signature
 * verification inside `SmsWebhookService`, when a webhook secret has been
 * configured for the credential.
 */
@Controller('notification-provider/sms/callback')
export class SmsWebhookController {
  constructor(private readonly webhookService: SmsWebhookService) {}

  @Public()
  @Post(':workspaceId/:providerKey')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<ISmsCallbackResult> {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    return this.webhookService.handleCallback(workspaceId, providerKey, body, headers, rawBody);
  }
}
