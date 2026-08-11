import { Controller, Post, Body, Param, Req, Headers, HttpCode, HttpStatus, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@modules/authentication/decorators/public.decorator';
import { PushWebhookService, IPushCallbackResult } from './push-webhook.service';

/**
 * Inbound push delivery/interaction callback endpoint. Public (no JWT) —
 * an external push provider cannot authenticate as an ATLAS user — with
 * workspace/provider context taken from the URL path, never the untrusted
 * vendor body. Vendor authenticity is established via HMAC signature
 * verification inside `PushWebhookService`, when a webhook secret has been
 * configured for the credential.
 */
@Controller('notification-provider/push/callback')
export class PushWebhookController {
  constructor(private readonly webhookService: PushWebhookService) {}

  @Public()
  @Post(':workspaceId/:providerKey')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<IPushCallbackResult> {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    return this.webhookService.handleCallback(workspaceId, providerKey, body, headers, rawBody);
  }
}
