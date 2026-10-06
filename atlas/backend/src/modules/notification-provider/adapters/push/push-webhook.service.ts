import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureVerifier } from '@modules/marketplace-webhook/signature/webhook-signature-verifier';
import { NotificationProviderConfigurationService } from '../../configuration/notification-provider-configuration.service';
import { NotificationProviderCredentialService } from '../../credentials/notification-provider-credential.service';
import { NotificationDeliveryService } from '../../delivery/notification-delivery.service';
import { PushDeviceTokenService } from './push-device-token.service';
import { IPushProviderSettings } from './push-provider-adapter.interfaces';
import { NotificationProviderChannel, NotificationDeliveryStatus } from '../../../../notification-provider/interfaces';

const STATUS_MAP: Record<string, NotificationDeliveryStatus> = {
  queued: NotificationDeliveryStatus.QUEUED,
  accepted: NotificationDeliveryStatus.SENT,
  sent: NotificationDeliveryStatus.SENT,
  delivered: NotificationDeliveryStatus.DELIVERED,
  opened: NotificationDeliveryStatus.OPENED,
  clicked: NotificationDeliveryStatus.OPENED,
  rejected: NotificationDeliveryStatus.REJECTED,
  failed: NotificationDeliveryStatus.FAILED,
  cancelled: NotificationDeliveryStatus.CANCELLED,
};

const DEFAULT_INVALID_TOKEN_ERROR_CODES = [
  'UNREGISTERED',
  'INVALID_ARGUMENT',
  'BADDEVICETOKEN',
  'UNREGISTERED_DEVICE',
  'NOT_REGISTERED',
];

export interface IPushCallbackResult {
  accepted: boolean;
  deliveryId?: string;
  reason?: string;
}

/**
 * Handles inbound push delivery/interaction callbacks (delivered, opened/
 * clicked, rejected/failed, plus asynchronous invalid-token feedback).
 * Mirrors the SMS/WhatsApp webhook handler shape (verify signature if a
 * secret is configured → look up the original record by the vendor's own
 * reference id → map status → update → ack), reusing
 * `WebhookSignatureVerifier` directly. Workspace/provider context come from
 * the callback URL's path params, never the untrusted vendor body.
 */
@Injectable()
export class PushWebhookService {
  private readonly logger = new Logger(PushWebhookService.name);

  constructor(
    private readonly configService: NotificationProviderConfigurationService,
    private readonly credentialService: NotificationProviderCredentialService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly deviceTokenService: PushDeviceTokenService,
    private readonly signatureVerifier: WebhookSignatureVerifier,
  ) {}

  async handleCallback(
    workspaceId: string,
    providerKey: string,
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<IPushCallbackResult> {
    const configs = await this.configService.resolveApplicable(
      workspaceId,
      NotificationProviderChannel.PUSH,
      providerKey,
    );
    const config = configs[0];
    const settings = (config?.settings ?? {}) as unknown as IPushProviderSettings;

    await this.verifySignatureIfConfigured(workspaceId, providerKey, settings, headers, rawBody);

    const invalidCode = this.extractField(body, settings.invalidTokenResponsePath, [
      'errorCode',
      'error_code',
    ]);
    const deviceToken = this.extractField(body, undefined, ['token', 'deviceToken', 'registration_id']);

    if (
      invalidCode &&
      deviceToken &&
      (settings.invalidTokenErrorCodes ?? DEFAULT_INVALID_TOKEN_ERROR_CODES).some(
        (c) => c.toUpperCase() === String(invalidCode).toUpperCase(),
      )
    ) {
      await this.deviceTokenService.markInvalid(workspaceId, String(deviceToken), String(invalidCode));
    }

    const providerRef = this.extractField(body, settings.messageIdResponsePath, [
      'messageId',
      'id',
      'name',
    ]);

    if (!providerRef) {
      this.logger.warn(`Push callback for workspace ${workspaceId} had no extractable message reference`);
      return { accepted: false, reason: 'missing message reference' };
    }

    const rawStatus = this.extractField(body, settings.statusResponsePath, ['status', 'Status']);
    const status = rawStatus ? STATUS_MAP[String(rawStatus).toLowerCase()] : undefined;

    if (!status) {
      this.logger.warn(`Push callback for ${providerRef} had unrecognized status '${String(rawStatus)}'`);
      return { accepted: false, reason: 'unrecognized status' };
    }

    const errorMessage = this.extractField(body, undefined, ['errorMessage', 'error_message']);

    const updated = await this.deliveryService.applyStatusCallback(workspaceId, String(providerRef), status, {
      errorCode: invalidCode ? String(invalidCode) : undefined,
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
    settings: IPushProviderSettings,
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
      throw new UnauthorizedException('Missing push webhook signature');
    }

    const valid =
      settings.webhookSignatureAlgorithm === 'HMAC_SHA1'
        ? this.signatureVerifier.verifyHmacSha1(rawBody, signature, secret)
        : this.signatureVerifier.verifyHmacSha256(rawBody, signature, secret);

    if (!valid) {
      throw new UnauthorizedException('Invalid push webhook signature');
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
