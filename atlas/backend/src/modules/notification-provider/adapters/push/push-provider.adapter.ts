import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { PushDeviceTokenService } from './push-device-token.service';
import {
  IPushProviderSettings,
  IPushSendMetadata,
  IPushProviderRequestPayload,
  IPushProviderResponsePayload,
} from './push-provider-adapter.interfaces';
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

export const PUSH_ADAPTER_PROVIDER_KEY = 'generic-push-rest';

interface IWorkspacePushState {
  settings: IPushProviderSettings;
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

/**
 * Generic, configuration-driven push channel adapter — implements the
 * Notification Provider Framework's `INotificationProvider` contract for
 * PUSH. Works against any push REST API (FCM/APNs-fronting HTTP
 * gateway/Web Push service) pointed at via
 * `NotificationProviderConfig.settings`; no specific vendor SDK/wire-format
 * is hardcoded, per "keep provider-specific API logic isolated and
 * configuration-driven".
 *
 * Detects invalid/unregistered device tokens (from either the send
 * response or an async webhook — see `PushWebhookService`) and marks them
 * invalid in `PushDeviceTokenService` so future target-resolved sends stop
 * including them. This is the one place this adapter touches persistence
 * directly — a deliberate, narrow exception to the "adapters are DB-free"
 * norm the email/SMS/WhatsApp adapters follow, required by the explicit
 * "manage device tokens, invalid-token handling" scope.
 *
 * Asynchronous delivery/interaction callbacks (queued→sent→delivered→
 * opened, or rejected/failed) are handled separately by
 * `PushWebhookController`/`PushWebhookService`.
 */
@Injectable()
export class PushProviderAdapter implements INotificationProvider, OnModuleInit {
  private readonly logger = new Logger(PushProviderAdapter.name);
  private readonly workspaceStates = new Map<string, IWorkspacePushState>();
  private lastHealthCheckSettings?: IPushProviderSettings;

  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly deviceTokenService: PushDeviceTokenService,
  ) {}

  onModuleInit(): void {
    if (!this.registry.has(PUSH_ADAPTER_PROVIDER_KEY)) {
      this.registry.register(this);
    }
  }

  getMetadata(): INotificationProviderMetadata {
    return {
      providerKey: PUSH_ADAPTER_PROVIDER_KEY,
      displayName: 'Generic Push REST Adapter',
      version: '1.0.0',
      channels: [NotificationProviderChannel.PUSH],
      capabilities: [
        'TRANSACTIONAL',
        'BULK',
        'SCHEDULED',
        'QUEUED',
        'MEDIA',
        'ACTIONS',
        'CUSTOM_DATA',
        'INTERACTION_RECEIPTS',
      ],
    };
  }

  async initialize(config: INotificationProviderConfig): Promise<void> {
    const settings = (config.settings ?? {}) as unknown as IPushProviderSettings;

    if (!settings.apiBaseUrl) {
      throw new NotificationProviderRequestFailedException(
        PUSH_ADAPTER_PROVIDER_KEY,
        `Missing required setting 'apiBaseUrl' for workspace '${config.workspaceId}'`,
      );
    }

    const state: IWorkspacePushState = { settings };
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
        providerKey: PUSH_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNKNOWN,
        lifecycleStatus: NotificationProviderLifecycleStatus.UNINITIALIZED,
        lastCheckedAt: new Date(),
        message: 'Adapter has not been initialized for any workspace yet',
      };
    }

    if (!settings.healthCheckUrl) {
      return {
        providerKey: PUSH_ADAPTER_PROVIDER_KEY,
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
        providerKey: PUSH_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.HEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.READY,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerKey: PUSH_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNHEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.DEGRADED,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
        message: (error as Error).message,
      };
    }
  }

  supportsChannel(channel: NotificationProviderChannel): boolean {
    return channel === NotificationProviderChannel.PUSH;
  }

  async send(request: INotificationSendRequest): Promise<INotificationSendResult> {
    const state = this.workspaceStates.get(request.workspaceId);
    if (!state) {
      throw new NotificationProviderRequestFailedException(
        PUSH_ADAPTER_PROVIDER_KEY,
        `Adapter has not been initialized for workspace '${request.workspaceId}'`,
      );
    }

    const meta = (request.metadata ?? {}) as IPushSendMetadata;
    const recipient = request.recipients[0];

    const payload: IPushProviderRequestPayload = {
      to: recipient.address,
      title: request.subject,
      body: request.body,
      image: meta.image,
      icon: meta.icon,
      sound: meta.sound,
      badge: meta.badge,
      deepLink: meta.deepLink,
      actions: meta.actions,
      data: meta.data,
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

      const response = await axios.request<IPushProviderResponsePayload>({
        method: state.settings.httpMethod ?? 'POST',
        url: state.settings.apiBaseUrl,
        headers,
        auth: state.basicAuth,
        data: payload,
      });

      const invalidCode = this.extractField(
        response.data,
        state.settings.invalidTokenResponsePath,
        ['errorCode', 'error_code'],
      );
      if (invalidCode && this.isInvalidTokenCode(String(invalidCode), state.settings)) {
        await this.deviceTokenService.markInvalid(
          request.workspaceId,
          recipient.address,
          String(invalidCode),
        );
        return {
          providerKey: PUSH_ADAPTER_PROVIDER_KEY,
          channel: NotificationProviderChannel.PUSH,
          status: NotificationDeliveryStatus.REJECTED,
          deliveredCount: 0,
          failedCount: 1,
          errors: [
            {
              code: String(invalidCode),
              message: 'Device token is invalid or unregistered',
              retryable: false,
            },
          ],
          latencyMs: Date.now() - startedAt,
        };
      }

      const providerRef = this.extractField(response.data, state.settings.messageIdResponsePath, [
        'messageId',
        'id',
        'name',
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
        providerKey: PUSH_ADAPTER_PROVIDER_KEY,
        channel: NotificationProviderChannel.PUSH,
        status,
        providerRef: providerRef ? String(providerRef) : undefined,
        deliveredCount: request.recipients.length,
        failedCount: 0,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const invalidCode = this.extractInvalidTokenCodeFromError(error, state.settings);
      if (invalidCode) {
        await this.deviceTokenService.markInvalid(request.workspaceId, recipient.address, invalidCode);
        throw new NotificationProviderRequestFailedException(
          PUSH_ADAPTER_PROVIDER_KEY,
          `Device token invalid/unregistered (${invalidCode})`,
        );
      }
      throw this.normalizeHttpError(error);
    }
  }

  private isInvalidTokenCode(code: string, settings: IPushProviderSettings): boolean {
    const known = settings.invalidTokenErrorCodes ?? DEFAULT_INVALID_TOKEN_ERROR_CODES;
    return known.some((c) => c.toUpperCase() === code.toUpperCase());
  }

  private extractInvalidTokenCodeFromError(
    error: unknown,
    settings: IPushProviderSettings,
  ): string | undefined {
    const err = error as { response?: { data?: Record<string, unknown> } };
    if (!err.response?.data) return undefined;

    const code = this.extractField(err.response.data, settings.invalidTokenResponsePath, [
      'errorCode',
      'error_code',
    ]);
    if (code && this.isInvalidTokenCode(String(code), settings)) {
      return String(code);
    }
    return undefined;
  }

  private extractField(
    data: IPushProviderResponsePayload,
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
      return new NotificationProviderTimeoutException(PUSH_ADAPTER_PROVIDER_KEY, 0);
    }

    const status = err.response?.status;
    if (status === 429) {
      return new NotificationProviderRateLimitedException(PUSH_ADAPTER_PROVIDER_KEY);
    }
    if (!err.response || (status && status >= 500)) {
      return new NotificationProviderUnavailableException(PUSH_ADAPTER_PROVIDER_KEY);
    }

    return new NotificationProviderRequestFailedException(
      PUSH_ADAPTER_PROVIDER_KEY,
      err.message ?? 'Unknown push provider error',
    );
  }
}
