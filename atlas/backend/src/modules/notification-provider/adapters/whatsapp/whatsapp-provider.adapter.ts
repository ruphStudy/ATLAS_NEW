import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { WhatsAppTemplateRenderer } from './whatsapp-template.renderer';
import {
  IWhatsAppProviderSettings,
  IWhatsAppSendMetadata,
  IWhatsAppProviderRequestPayload,
  IWhatsAppProviderResponsePayload,
} from './whatsapp-provider-adapter.interfaces';
import { NotificationProviderRegistry } from '../../../../notification-provider/registry/notification-provider.registry';
import {
  INotificationProvider,
  INotificationProviderMetadata,
  INotificationProviderConfig,
  INotificationProviderHealth,
  INotificationSendRequest,
  INotificationSendResult,
  NotificationProviderChannel,
  NotificationProviderHealthStatus,
  NotificationProviderLifecycleStatus,
  NotificationDeliveryStatus,
} from '../../../../notification-provider/interfaces';
import {
  NotificationProviderTimeoutException,
  NotificationProviderRateLimitedException,
  NotificationProviderUnavailableException,
  NotificationProviderRequestFailedException,
  NotificationProviderTemplateRequiredException,
} from '../../../../notification-provider/exceptions/notification-provider.exceptions';

export const WHATSAPP_ADAPTER_PROVIDER_KEY = 'generic-whatsapp-rest';

interface IWorkspaceWhatsAppState {
  settings: IWhatsAppProviderSettings;
  authHeaderName?: string;
  authHeaderValue?: string;
  basicAuth?: { username: string; password: string };
}

/** Case-insensitive provider-status → normalized delivery-status lookup, with a SENT fallback for unrecognized values. */
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

/**
 * Generic, configuration-driven WhatsApp channel adapter — implements the
 * Notification Provider Framework's `INotificationProvider` contract for
 * WHATSAPP. Works against any WhatsApp Business Solution Provider (BSP)
 * REST API pointed at via `NotificationProviderConfig.settings`; no
 * specific vendor SDK/wire-format is hardcoded, per "keep provider-specific
 * API logic isolated and configuration-driven".
 *
 * Enforces the WhatsApp Business API consent/template rule: outside an
 * active customer-service session, only approved-template sends are
 * allowed — free-text is rejected before any HTTP call is made (see
 * `assertTemplateOrConsent`).
 *
 * Asynchronous delivery-receipt/status callbacks (queued→sent→delivered→
 * read, or undelivered/rejected) are handled separately by
 * `WhatsAppWebhookController`/`WhatsAppWebhookService`, not by this class.
 *
 * One instance is registered globally with `NotificationProviderRegistry`;
 * per-workspace resolved settings/credentials live in an internal map keyed
 * by workspaceId (not instance fields), so concurrent sends for different
 * workspaces never cross-contaminate state.
 */
@Injectable()
export class WhatsAppProviderAdapter implements INotificationProvider, OnModuleInit {
  private readonly logger = new Logger(WhatsAppProviderAdapter.name);
  private readonly workspaceStates = new Map<string, IWorkspaceWhatsAppState>();
  private lastHealthCheckSettings?: IWhatsAppProviderSettings;

  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly templateRenderer: WhatsAppTemplateRenderer,
  ) {}

  onModuleInit(): void {
    if (!this.registry.has(WHATSAPP_ADAPTER_PROVIDER_KEY)) {
      this.registry.register(this);
    }
  }

  getMetadata(): INotificationProviderMetadata {
    return {
      providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
      displayName: 'Generic WhatsApp REST Adapter',
      version: '1.0.0',
      channels: [NotificationProviderChannel.WHATSAPP],
      capabilities: [
        'TRANSACTIONAL',
        'BULK',
        'SCHEDULED',
        'QUEUED',
        'TEMPLATES',
        'MEDIA',
        'DOCUMENTS',
        'BUTTONS',
        'INTERACTIVE',
        'READ_RECEIPTS',
      ],
    };
  }

  async initialize(config: INotificationProviderConfig): Promise<void> {
    const settings = (config.settings ?? {}) as unknown as IWhatsAppProviderSettings;

    if (!settings.apiBaseUrl) {
      throw new NotificationProviderRequestFailedException(
        WHATSAPP_ADAPTER_PROVIDER_KEY,
        `Missing required setting 'apiBaseUrl' for workspace '${config.workspaceId}'`,
      );
    }

    const state: IWorkspaceWhatsAppState = { settings };
    const fields = config.resolvedCredentialFields;

    switch (settings.authType) {
      case 'BASIC': {
        const usernameField = settings.usernameField ?? 'username';
        const passwordField = settings.passwordField ?? 'password';
        if (fields?.[usernameField] && fields?.[passwordField]) {
          state.basicAuth = { username: fields[usernameField], password: fields[passwordField] };
        }
        break;
      }
      case 'NONE':
        break;
      case 'BEARER':
      case 'API_KEY_HEADER':
      default: {
        const apiKeyField = settings.apiKeyField ?? 'apiKey';
        const apiKey = fields?.[apiKeyField];
        if (apiKey) {
          state.authHeaderName = settings.authHeaderName ?? 'Authorization';
          state.authHeaderValue = `${settings.authValuePrefix ?? 'Bearer '}${apiKey}`;
        }
        break;
      }
    }

    this.workspaceStates.set(config.workspaceId, state);
    this.lastHealthCheckSettings = settings;
  }

  async getHealth(): Promise<INotificationProviderHealth> {
    const settings = this.lastHealthCheckSettings;

    if (!settings) {
      return {
        providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNKNOWN,
        lifecycleStatus: NotificationProviderLifecycleStatus.UNINITIALIZED,
        lastCheckedAt: new Date(),
        message: 'Adapter has not been initialized for any workspace yet',
      };
    }

    if (!settings.healthCheckUrl) {
      return {
        providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.HEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.READY,
        lastCheckedAt: new Date(),
        message: 'No healthCheckUrl configured — assuming healthy once initialized',
      };
    }

    const startedAt = Date.now();
    try {
      await axios.request({
        method: settings.healthCheckMethod ?? 'GET',
        url: settings.healthCheckUrl,
      });
      return {
        providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.HEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.READY,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNHEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.DEGRADED,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
        message: (error as Error).message,
      };
    }
  }

  supportsChannel(channel: NotificationProviderChannel): boolean {
    return channel === NotificationProviderChannel.WHATSAPP;
  }

  async send(request: INotificationSendRequest): Promise<INotificationSendResult> {
    const state = this.workspaceStates.get(request.workspaceId);
    if (!state) {
      throw new NotificationProviderRequestFailedException(
        WHATSAPP_ADAPTER_PROVIDER_KEY,
        `Adapter has not been initialized for workspace '${request.workspaceId}'`,
      );
    }

    const meta = (request.metadata ?? {}) as IWhatsAppSendMetadata;
    const hasTemplate = !!request.template?.templateId;
    const hasFreeText = !!request.body;

    this.assertTemplateOrConsent(state.settings, hasTemplate, hasFreeText, meta.sessionActive);

    const variables = request.template?.variables;
    const isAtlasRendered = meta.templateSource !== 'PROVIDER' && !hasTemplate && hasFreeText;

    const text = isAtlasRendered
      ? this.templateRenderer.render(request.body ?? '', variables)
      : hasTemplate
      ? undefined
      : request.body;

    const recipient = request.recipients[0];
    const to = this.normalizePhoneNumber(
      recipient.address,
      meta.countryCode ?? state.settings.defaultCountryCode,
    );

    const payload: IWhatsAppProviderRequestPayload = {
      from: state.settings.senderPhoneId,
      to,
      text,
      templateId: hasTemplate ? request.template?.templateId : undefined,
      templateVariables: hasTemplate ? variables : undefined,
      media: request.attachments?.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        content: a.contentBase64,
        url: a.url,
      })),
      interactive: meta.interactive,
      idempotencyKey: request.idempotencyKey,
    };

    const startedAt = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...state.settings.extraHeaders,
      };
      if (state.authHeaderName && state.authHeaderValue) {
        headers[state.authHeaderName] = state.authHeaderValue;
      }
      if (request.idempotencyKey) {
        headers['Idempotency-Key'] = request.idempotencyKey;
      }

      const response = await axios.request<IWhatsAppProviderResponsePayload>({
        method: state.settings.httpMethod ?? 'POST',
        url: state.settings.apiBaseUrl,
        headers,
        auth: state.basicAuth,
        data: payload,
      });

      const providerRef = this.extractField(response.data, state.settings.messageIdResponsePath, [
        'messageId',
        'id',
        'wamid',
        'MessageSid',
      ]);
      const rawStatus = this.extractField(response.data, state.settings.statusResponsePath, [
        'status',
        'Status',
      ]);
      const status =
        rawStatus
          ? (STATUS_MAP[String(rawStatus).toLowerCase()] ?? NotificationDeliveryStatus.SENT)
          : NotificationDeliveryStatus.SENT;

      return {
        providerKey: WHATSAPP_ADAPTER_PROVIDER_KEY,
        channel: NotificationProviderChannel.WHATSAPP,
        status,
        providerRef: providerRef ? String(providerRef) : undefined,
        deliveredCount: request.recipients.length,
        failedCount: 0,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      throw this.normalizeHttpError(error);
    }
  }

  /**
   * Enforces the WhatsApp Business API consent/template rule: a
   * business-initiated free-text message outside an active 24h
   * customer-service session is not policy-compliant — only approved
   * templates are. `sessionActive` is caller-asserted (ATLAS does not track
   * WhatsApp conversation windows itself); when absent it's treated as "no
   * active session".
   */
  private assertTemplateOrConsent(
    settings: IWhatsAppProviderSettings,
    hasTemplate: boolean,
    hasFreeText: boolean,
    sessionActive?: boolean,
  ): void {
    if (settings.requireApprovedTemplateOutsideSession === false) return;
    if (hasTemplate || !hasFreeText || sessionActive) return;

    throw new NotificationProviderTemplateRequiredException(
      WHATSAPP_ADAPTER_PROVIDER_KEY,
      'free-text content requires an active customer-service session; use an approved template instead',
    );
  }

  /**
   * Best-effort E.164-ish normalization: leaves already-prefixed numbers
   * untouched, otherwise prepends a configured dialing prefix. No ISO
   * alpha-2 → dialing-code lookup — callers should supply the dialing
   * prefix directly.
   */
  private normalizePhoneNumber(address: string, countryCode?: string): string {
    if (address.startsWith('+') || !countryCode) return address;

    const digitsOnlyCode = countryCode.replace(/[^\d]/g, '');
    if (!digitsOnlyCode) return address;

    return `+${digitsOnlyCode}${address.replace(/^0+/, '')}`;
  }

  private extractField(
    data: IWhatsAppProviderResponsePayload,
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

  private normalizeHttpError(error: unknown): Error {
    const err = error as {
      code?: string;
      message?: string;
      response?: { status?: number };
    };

    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message ?? '')) {
      return new NotificationProviderTimeoutException(WHATSAPP_ADAPTER_PROVIDER_KEY, 0);
    }

    const status = err.response?.status;
    if (status === 429) {
      return new NotificationProviderRateLimitedException(WHATSAPP_ADAPTER_PROVIDER_KEY);
    }
    if (!err.response || (status && status >= 500)) {
      return new NotificationProviderUnavailableException(WHATSAPP_ADAPTER_PROVIDER_KEY);
    }

    return new NotificationProviderRequestFailedException(
      WHATSAPP_ADAPTER_PROVIDER_KEY,
      err.message ?? 'Unknown WhatsApp provider error',
    );
  }
}
