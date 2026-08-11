import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureVerifier } from '@modules/marketplace-webhook/signature/webhook-signature-verifier';
import { NotificationProviderConfigurationService } from '../../configuration/notification-provider-configuration.service';
import { NotificationProviderCredentialService } from '../../credentials/notification-provider-credential.service';
import { NotificationDeliveryService } from '../../delivery/notification-delivery.service';
import { ISmsProviderSettings } from './sms-provider-adapter.interfaces';
import { NotificationProviderChannel, NotificationDeliveryStatus } from '../../../../notification-provider/interfaces';

const STATUS_MAP: Record<string, NotificationDeliveryStatus> = {
  queued: NotificationDeliveryStatus.QUEUED,
  accepted: NotificationDeliveryStatus.SENT,
  sent: NotificationDeliveryStatus.SENT,
  delivered: NotificationDeliveryStatus.DELIVERED,
  undelivered: NotificationDeliveryStatus.UNDELIVERED,
  rejected: NotificationDeliveryStatus.REJECTED,
  failed: NotificationDeliveryStatus.FAILED,
  cancelled: NotificationDeliveryStatus.CANCELLED,
};

export interface ISmsCallbackResult {
  accepted: boolean;
  deliveryId?: string;
  reason?: string;
}

/**
 * Handles inbound SMS delivery-receipt/status-callback webhooks. Mirrors
 * marketplace-webhook's handler shape (verify signature if a secret is
 * configured → look up the original record by the vendor's own reference
 * id → map status → update → ack), reusing
 * `WebhookSignatureVerifier` directly rather than re-implementing HMAC
 * verification. Workspace context and which provider config to use both
 * come from the callback URL's path params — never trusted from the
 * vendor-supplied body — since an external vendor cannot authenticate as
 * an ATLAS user.
 */
@Injectable()
export class SmsWebhookService {
  private readonly logger = new Logger(SmsWebhookService.name);

  constructor(
    private readonly configService: NotificationProviderConfigurationService,
    private readonly credentialService: NotificationProviderCredentialService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly signatureVerifier: WebhookSignatureVerifier,
  ) {}

  async handleCallback(
    workspaceId: string,
    providerKey: string,
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<ISmsCallbackResult> {
    const configs = await this.configService.resolveApplicable(
      workspaceId,
      NotificationProviderChannel.SMS,
      providerKey,
    );
    const config = configs[0];
    const settings = (config?.settings ?? {}) as unknown as ISmsProviderSettings;

    await this.verifySignatureIfConfigured(workspaceId, providerKey, settings, headers, rawBody);

    const providerRef = this.extractField(body, settings.messageIdResponsePath, [
      'messageId',
      'id',
      'MessageSid',
      'sid',
    ]);

    if (!providerRef) {
      this.logger.warn(`SMS callback for workspace ${workspaceId} had no extractable message reference`);
      return { accepted: false, reason: 'missing message reference' };
    }

    const rawStatus = this.extractField(body, settings.statusResponsePath, ['status', 'Status', 'MessageStatus']);
    const status = (rawStatus && STATUS_MAP[String(rawStatus).toLowerCase()]) ?? undefined;

    if (!status) {
      this.logger.warn(`SMS callback for ${providerRef} had unrecognized status '${String(rawStatus)}'`);
      return { accepted: false, reason: 'unrecognized status' };
    }

    const errorCode = this.extractField(body, undefined, ['errorCode', 'error_code', 'ErrorCode']);
    const errorMessage = this.extractField(body, undefined, ['errorMessage', 'error_message', 'ErrorMessage']);

    const updated = await this.deliveryService.applyStatusCallback(workspaceId, String(providerRef), status, {
      errorCode: errorCode ? String(errorCode) : undefined,
      errorMessage: errorMessage ? String(errorMessage) : undefined,
    });

    if (!updated) {
      return { accepted: false, reason: 'no matching delivery found for reference' };
    }

    return { accepted: true, deliveryId: updated.id };
  }

  private async verifySignatureIfConfigured(
    workspaceId: string,
    providerKey: string,
    settings: ISmsProviderSettings,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<void> {
    const secretField = settings.webhookSecretField ?? 'webhookSecret';
    const fields = await this.credentialService
      .resolveDecrypted(workspaceId, providerKey)
      .catch(() => undefined);
    const secret = fields?.[secretField];

    if (!secret) {
      return;
    }

    const headerName = (settings.webhookSignatureHeader ?? 'x-signature').toLowerCase();
    const signatureHeader = headers[headerName];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      throw new UnauthorizedException('Missing SMS webhook signature');
    }

    const valid =
      settings.webhookSignatureAlgorithm === 'HMAC_SHA1'
        ? this.signatureVerifier.verifyHmacSha1(rawBody, signature, secret)
        : this.signatureVerifier.verifyHmacSha256(rawBody, signature, secret);

    if (!valid) {
      throw new UnauthorizedException('Invalid SMS webhook signature');
    }
  }

  private extractField(
    data: Record<string, unknown>,
    path: string | undefined,
    fallbackKeys: string[],
  ): unknown {
    if (path) {
      const value = path.split('.').reduce<unknown>((acc, key) => {
        if (acc && typeof acc === 'object') {
          return (acc as Record<string, unknown>)[key];
        }
        return undefined;
      }, data);
      if (value !== undefined) return value;
    }

    for (const key of fallbackKeys) {
      if (data?.[key] !== undefined) return data[key];
    }
    return undefined;
  }
}
