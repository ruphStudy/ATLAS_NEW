import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@modules/authentication/decorators/public.decorator';
import { WhatsAppWebhookService, IWhatsAppCallbackResult } from './whatsapp-webhook.service';

/**
 * Inbound WhatsApp delivery-receipt/status-callback endpoint. Public (no
 * JWT) — an external BSP cannot authenticate as an ATLAS user — with
 * workspace/provider context taken from the URL path (configured at
 * credential-setup time), never from the untrusted vendor body. Supports
 * the Meta Cloud API-style GET verification handshake
 * (`hub.mode`/`hub.verify_token`/`hub.challenge`) in addition to the POST
 * status-batch callback. Vendor authenticity for POST callbacks is
 * established via HMAC signature verification in `WhatsAppWebhookService`
 * when a webhook secret has been configured for the credential.
 */
@Controller('notification-provider/whatsapp/callback')
export class WhatsAppWebhookController {
  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  @Public()
  @Get(':workspaceId/:providerKey')
  async verifyHandshake(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.webhookService.verifyHandshake(
      workspaceId,
      providerKey,
      mode,
      verifyToken,
      challenge,
    );

    if (result === null) {
      res.status(HttpStatus.FORBIDDEN).send();
      return;
    }

    res.status(HttpStatus.OK).send(result);
  }

  @Public()
  @Post(':workspaceId/:providerKey')
  @HttpCode(HttpStatus.OK)
  async handleCallback(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<IWhatsAppCallbackResult> {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body ?? {}));
    return this.webhookService.handleCallback(workspaceId, providerKey, body, headers, rawBody);
  }
}
