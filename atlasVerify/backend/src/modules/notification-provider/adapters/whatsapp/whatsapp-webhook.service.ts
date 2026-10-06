import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureVerifier } from '@modules/marketplace-webhook/signature/webhook-signature-verifier';
import { NotificationProviderConfigurationService } from '../../configuration/notification-provider-configuration.service';
import { NotificationProviderCredentialService } from '../../credentials/notification-provider-credential.service';
import { NotificationDeliveryService } from '../../delivery/notification-delivery.service';
import { IWhatsAppProviderSettings } from './whatsapp-provider-adapter.interfaces';
import { NotificationProviderChannel, NotificationDeliveryStatus } from '../../../../notification-provider/interfaces';

const STATUS_MAP: Record<string, NotificationDeliveryStatus> = {
  queued: NotificationDeliveryStatus.QUEUED,
  accepted: NotificationDeliveryStatus.SENT,
  sent: NotificationDeliveryStatus.SENT,
  delivered: NotificationDeliveryStatus.DELIVERED,
  read: NotificationDeliveryStatus.READ,
  undelivered: NotificationDeliveryStatus.UNDELIVERED,
  rejected: NotificationDeliveryStatus.REJECTED,
  failed: NotificationDeliveryStatus.FAILED,
  cancelled: NotificationDeliveryStatus.CANCELLED,
};

/** Default fallback path for Meta WhatsApp Cloud API's status-batch shape: entry[0].changes[0].value.statuses[]. */
const DEFAULT_STATUS_ARRAY_PATH = 'entry.0.changes.0.value.statuses';

export interface IWhatsAppCallbackResult {
  accepted: boolean;
  processedCount: number;
  reason?: string;
}

/**
 * Handles inbound WhatsApp delivery-receipt/status-callback webhooks.
 * Mirrors marketplace-webhook's handler shape (verify signature if a secret
 * is configured → look up each original record by the vendor's own
 * reference id → map status → update → ack), reusing
 * `WebhookSignatureVerifier` directly. Supports the Meta Cloud API-style
 * GET verification handshake as well as POST status batches (one callback
 * can carry multiple message-status updates).
 *
 * Workspace context and which provider config to use both come from the
 * callback URL's path params — never trusted from the vendor-supplied
 * body — since an external vendor cannot authenticate as an ATLAS user.
 */
@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name);

  constructor(
    private readonly configService: NotificationProviderConfigurationService,
    private readonly credentialService: NotificationProviderCredentialService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly signatureVerifier: WebhookSignatureVerifier,
  ) {}

  async verifyHandshake(
    workspaceId: string,
    providerKey: string,
    mode: string | undefined,
    verifyToken: string | undefined,
    challenge: string | undefined,
  ): Promise<string | null> {
    if (mode !== 'subscribe' || !verifyToken || !challenge) {
      return null;
    }

    const configs = await this.configService.resolveApplicable(
      workspaceId,
      NotificationProviderChannel.WHATSAPP,
      providerKey,
    );
    const settings = (configs[0]?.settings ?? {}) as unknown as IWhatsAppProviderSettings;
    const verifyTokenField = settings.webhookVerifyTokenField ?? 'verifyToken';

    const fields = await this.credentialService
      .resolveDecrypted(workspaceId, providerKey)
      .catch(() => undefined);
    const expectedToken = fields?.[verifyTokenField];

    if (!expectedToken || expectedToken !== verifyToken) {
      return null;
    }

    return challenge;
  }

  async handleCallback(
    workspaceId: string,
    providerKey: string,
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<IWhatsAppCallbackResult> {
    const configs = await this.configService.resolveApplicable(
      workspaceId,
      NotificationProviderChannel.WHATSAPP,
      providerKey,
    );
    const config = configs[0];
    const settings = (config?.settings ?? {}) as unknown as IWhatsAppProviderSettings;

    await this.verifySignatureIfConfigured(workspaceId, providerKey, settings, headers, rawBody);

    const statusEvents = this.extractStatusEvents(body, settings);

    if (statusEvents.length === 0) {
      this.logger.debug(`WhatsApp callback for workspace ${workspaceId} carried no status events`);
      return { accepted: true, processedCount: 0, reason: 'no status events in payload' };
    }

    let processedCount = 0;

    for (const event of statusEvents) {
      const providerRef = this.extractField(event, settings.messageIdResponsePath, [
        'messageId',
        'id',
        'wamid',
        'MessageSid',
      ]);
      if (!providerRef) continue;

      const rawStatus = this.extractField(event, settings.statusResponsePath, ['status', 'Status']);
      const status = rawStatus ? STATUS_MAP[String(rawStatus).toLowerCase()] : undefined;
      if (!status) continue;

      const errorCode = this.extractField(event, undefined, ['errorCode', 'error_code']);
      const errorMessage = this.extractField(event, undefined, [
        'errorMessage',
        'error_message',
        'errors.0.title',
      ]);

      const updated = await this.deliveryService.applyStatusCallback(
        workspaceId,
        String(providerRef),
        status,
        {
          errorCode: errorCode ? String(errorCode) : undefined,
          errorMessage: errorMessage ? String(errorMessage) : undefined,
        },
      );

      if (updated) processedCount++;
    }

    return { accepted: true, processedCount };
  }

  private extractStatusEvents(
    body: Record<string, unknown>,
    settings: IWhatsAppProviderSettings,
  ): Record<string, unknown>[] {
    const path = settings.statusArrayPath ?? DEFAULT_STATUS_ARRAY_PATH;
    const arr = this.extractField(body, path, []);
    if (Array.isArray(arr)) {
      return arr as Record<string, unknown>[];
    }
    // Single-status fallback (SMS-like BSPs that don't batch).
    return [body];
  }

  private async verifySignatureIfConfigured(
    workspaceId: string,
    providerKey: string,
    settings: IWhatsAppProviderSettings,
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

    const headerName = (settings.webhookSignatureHeader ?? 'x-hub-signature-256').toLowerCase();
    const signatureHeader = headers[headerName];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature) {
      throw new UnauthorizedException('Missing WhatsApp webhook signature');
    }

    const valid =
      settings.webhookSignatureAlgorithm === 'HMAC_SHA1'
        ? this.signatureVerifier.verifyHmacSha1(rawBody, signature, secret)
        : this.signatureVerifier.verifyHmacSha256(rawBody, signature, secret);

    if (!valid) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }
  }

  private extractField(
    data: Record<string, unknown>,
    path: string | undefined,
    fallbackKeys: string[],
  ): unknown {
    if (path) {
      const value = path.split('.').reduce<unknown>((acc, key) => {
        if (Array.isArray(acc)) {
          const index = Number(key);
          return Number.isInteger(index) ? acc[index] : undefined;
        }
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
