import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { SmsTemplateRenderer } from './sms-template.renderer';
import {
  ISmsProviderSettings,
  ISmsSendMetadata,
  ISmsProviderRequestPayload,
  ISmsProviderResponsePayload,
} from './sms-provider-adapter.interfaces';
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
} from '../../../../notification-provider/exceptions/notification-provider.exceptions';

export const SMS_ADAPTER_PROVIDER_KEY = 'generic-sms-rest';

interface IWorkspaceSmsState {
  settings: ISmsProviderSettings;
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
  undelivered: NotificationDeliveryStatus.UNDELIVERED,
  rejected: NotificationDeliveryStatus.REJECTED,
  failed: NotificationDeliveryStatus.FAILED,
  cancelled: NotificationDeliveryStatus.CANCELLED,
};

/**
 * Generic, configuration-driven SMS channel adapter — implements the
 * Notification Provider Framework's `INotificationProvider` contract for
 * SMS. Works against ANY SMS REST API pointed at via
 * `NotificationProviderConfig.settings`; no specific vendor SDK/wire-format
 * is hardcoded, per "keep provider-specific API logic isolated and
 * configuration-driven". Asynchronous delivery-receipt/status callbacks
 * (queued→sent→delivered/undelivered/rejected) are handled separately by
 * `SmsWebhookController`/`SmsWebhookService`, not by this class.
 *
 * One instance is registered globally with `NotificationProviderRegistry`;
 * per-workspace resolved settings/credentials live in an internal map keyed
 * by workspaceId (not instance fields), so concurrent sends for different
 * workspaces never cross-contaminate state.
 */
@Injectable()
export class SmsProviderAdapter implements INotificationProvider, OnModuleInit {
  private readonly logger = new Logger(SmsProviderAdapter.name);
  private readonly workspaceStates = new Map<string, IWorkspaceSmsState>();
  private lastHealthCheckSettings?: ISmsProviderSettings;

  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly templateRenderer: SmsTemplateRenderer,
  ) {}

  onModuleInit(): void {
    if (!this.registry.has(SMS_ADAPTER_PROVIDER_KEY)) {
      this.registry.register(this);
    }
  }

  getMetadata(): INotificationProviderMetadata {
    return {
      providerKey: SMS_ADAPTER_PROVIDER_KEY,
      displayName: 'Generic SMS REST Adapter',
      version: '1.0.0',
      channels: [NotificationProviderChannel.SMS],
      capabilities: ['TRANSACTIONAL', 'BULK', 'SCHEDULED', 'QUEUED', 'TEMPLATES', 'DELIVERY_RECEIPTS'],
    };
  }

  async initialize(config: INotificationProviderConfig): Promise<void> {
    const settings = (config.settings ?? {}) as unknown as ISmsProviderSettings;

    if (!settings.apiBaseUrl) {
      throw new NotificationProviderRequestFailedException(
        SMS_ADAPTER_PROVIDER_KEY,
        `Missing required setting 'apiBaseUrl' for workspace '${config.workspaceId}'`,
      );
    }

    const state: IWorkspaceSmsState = { settings };
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
        providerKey: SMS_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNKNOWN,
        lifecycleStatus: NotificationProviderLifecycleStatus.UNINITIALIZED,
        lastCheckedAt: new Date(),
        message: 'Adapter has not been initialized for any workspace yet',
      };
    }

    if (!settings.healthCheckUrl) {
      return {
        providerKey: SMS_ADAPTER_PROVIDER_KEY,
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
        providerKey: SMS_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.HEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.READY,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerKey: SMS_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNHEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.DEGRADED,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
        message: (error as Error).message,
      };
    }
  }

  supportsChannel(channel: NotificationProviderChannel): boolean {
    return channel === NotificationProviderChannel.SMS;
  }

  async send(request: INotificationSendRequest): Promise<INotificationSendResult> {
    const state = this.workspaceStates.get(request.workspaceId);
    if (!state) {
      throw new NotificationProviderRequestFailedException(
        SMS_ADAPTER_PROVIDER_KEY,
        `Adapter has not been initialized for workspace '${request.workspaceId}'`,
      );
    }

    const meta = (request.metadata ?? {}) as ISmsSendMetadata;
    const variables = request.template?.variables;
    const isAtlasRendered = meta.templateSource !== 'PROVIDER' && !!request.body;

    const body = isAtlasRendered
      ? this.templateRenderer.render(request.body ?? '', variables)
      : request.body;

    const recipient = request.recipients[0];
    const to = this.normalizePhoneNumber(
      recipient.address,
      meta.countryCode ?? state.settings.defaultCountryCode,
    );

    const payload: ISmsProviderRequestPayload = {
      senderId: meta.senderId ?? state.settings.defaultSenderId,
      to,
      body,
      templateId: !isAtlasRendered ? request.template?.templateId : undefined,
      templateVariables: !isAtlasRendered ? variables : undefined,
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

      const response = await axios.request<ISmsProviderResponsePayload>({
        method: state.settings.httpMethod ?? 'POST',
        url: state.settings.apiBaseUrl,
        headers,
        auth: state.basicAuth,
        data: payload,
      });

      const providerRef = this.extractField(response.data, state.settings.messageIdResponsePath, [
        'messageId',
        'id',
        'MessageSid',
        'sid',
      ]);
      const rawStatus = this.extractField(response.data, state.settings.statusResponsePath, [
        'status',
        'Status',
      ]);
      const status =
        (rawStatus && STATUS_MAP[String(rawStatus).toLowerCase()]) ?? NotificationDeliveryStatus.SENT;

      return {
        providerKey: SMS_ADAPTER_PROVIDER_KEY,
        channel: NotificationProviderChannel.SMS,
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
   * Best-effort E.164-ish normalization: leaves already-prefixed numbers
   * untouched, otherwise prepends a configured dialing prefix (e.g. '+91' or
   * '91'). Does not attempt ISO alpha-2 → dialing-code lookup — no country
   * code database exists in this codebase to draw from, so callers should
   * supply the dialing prefix directly, not an alpha-2 code.
   */
  private normalizePhoneNumber(address: string, countryCode?: string): string {
    if (address.startsWith('+') || !countryCode) return address;

    const digitsOnlyCode = countryCode.replace(/[^\d]/g, '');
    if (!digitsOnlyCode) return address;

    return `+${digitsOnlyCode}${address.replace(/^0+/, '')}`;
  }

  private extractField(
    data: ISmsProviderResponsePayload,
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
      return new NotificationProviderTimeoutException(SMS_ADAPTER_PROVIDER_KEY, 0);
    }

    const status = err.response?.status;
    if (status === 429) {
      return new NotificationProviderRateLimitedException(SMS_ADAPTER_PROVIDER_KEY);
    }
    if (!err.response || (status && status >= 500)) {
      return new NotificationProviderUnavailableException(SMS_ADAPTER_PROVIDER_KEY);
    }

    return new NotificationProviderRequestFailedException(
      SMS_ADAPTER_PROVIDER_KEY,
      err.message ?? 'Unknown SMS provider error',
    );
  }
}
