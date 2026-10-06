import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { EmailTemplateRenderer } from './email-template.renderer';
import {
  IEmailProviderSettings,
  IEmailSendMetadata,
  IEmailProviderRequestPayload,
  IEmailProviderResponsePayload,
} from './email-provider-adapter.interfaces';
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

export const EMAIL_ADAPTER_PROVIDER_KEY = 'generic-email-rest';

interface IWorkspaceEmailState {
  settings: IEmailProviderSettings;
  authHeaderName?: string;
  authHeaderValue?: string;
  basicAuth?: { username: string; password: string };
}

/** Case-insensitive provider-status → normalized delivery-status lookup, with a SENT fallback for unrecognized values. */
const STATUS_MAP: Record<string, NotificationDeliveryStatus> = {
  sent: NotificationDeliveryStatus.SENT,
  queued: NotificationDeliveryStatus.QUEUED,
  accepted: NotificationDeliveryStatus.SENT,
  delivered: NotificationDeliveryStatus.DELIVERED,
  bounced: NotificationDeliveryStatus.BOUNCED,
  bounce: NotificationDeliveryStatus.BOUNCED,
  rejected: NotificationDeliveryStatus.REJECTED,
  failed: NotificationDeliveryStatus.FAILED,
  cancelled: NotificationDeliveryStatus.CANCELLED,
};

/**
 * Generic, configuration-driven email channel adapter — implements the
 * Notification Provider Framework's `INotificationProvider` contract for
 * EMAIL. Works against ANY email REST API that can be pointed at via
 * `NotificationProviderConfig.settings` (endpoint, auth scheme, response
 * field paths); no specific vendor SDK/wire-format is hardcoded here, per
 * "keep provider-specific API logic isolated and configuration-driven".
 *
 * One instance is registered globally with `NotificationProviderRegistry`
 * (shared across workspaces, mirroring the AI Provider Foundation's
 * registry shape) — per-workspace resolved settings/credentials are kept in
 * an internal map keyed by workspaceId rather than instance fields, so
 * concurrent sends for different workspaces never cross-contaminate state.
 */
@Injectable()
export class EmailProviderAdapter implements INotificationProvider, OnModuleInit {
  private readonly logger = new Logger(EmailProviderAdapter.name);
  private readonly workspaceStates = new Map<string, IWorkspaceEmailState>();
  private lastHealthCheckSettings?: IEmailProviderSettings;

  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly templateRenderer: EmailTemplateRenderer,
  ) {}

  onModuleInit(): void {
    if (!this.registry.has(EMAIL_ADAPTER_PROVIDER_KEY)) {
      this.registry.register(this);
    }
  }

  getMetadata(): INotificationProviderMetadata {
    return {
      providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
      displayName: 'Generic Email REST Adapter',
      version: '1.0.0',
      channels: [NotificationProviderChannel.EMAIL],
      capabilities: ['TRANSACTIONAL', 'BULK', 'SCHEDULED', 'QUEUED', 'TEMPLATES', 'ATTACHMENTS'],
    };
  }

  async initialize(config: INotificationProviderConfig): Promise<void> {
    const settings = (config.settings ?? {}) as unknown as IEmailProviderSettings;

    if (!settings.apiBaseUrl) {
      throw new NotificationProviderRequestFailedException(
        EMAIL_ADAPTER_PROVIDER_KEY,
        `Missing required setting 'apiBaseUrl' for workspace '${config.workspaceId}'`,
      );
    }

    const state: IWorkspaceEmailState = { settings };
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
        providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNKNOWN,
        lifecycleStatus: NotificationProviderLifecycleStatus.UNINITIALIZED,
        lastCheckedAt: new Date(),
        message: 'Adapter has not been initialized for any workspace yet',
      };
    }

    if (!settings.healthCheckUrl) {
      return {
        providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
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
        providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.HEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.READY,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
        status: NotificationProviderHealthStatus.UNHEALTHY,
        lifecycleStatus: NotificationProviderLifecycleStatus.DEGRADED,
        lastCheckedAt: new Date(),
        latencyMs: Date.now() - startedAt,
        message: (error as Error).message,
      };
    }
  }

  supportsChannel(channel: NotificationProviderChannel): boolean {
    return channel === NotificationProviderChannel.EMAIL;
  }

  async send(request: INotificationSendRequest): Promise<INotificationSendResult> {
    const state = this.workspaceStates.get(request.workspaceId);
    if (!state) {
      throw new NotificationProviderRequestFailedException(
        EMAIL_ADAPTER_PROVIDER_KEY,
        `Adapter has not been initialized for workspace '${request.workspaceId}'`,
      );
    }

    const meta = (request.metadata ?? {}) as IEmailSendMetadata;
    const variables = request.template?.variables;
    const isAtlasRendered =
      meta.templateSource !== 'PROVIDER' && (!!request.subject || !!request.body || !!meta.html || !!meta.text);

    const subject = isAtlasRendered
      ? this.templateRenderer.render(request.subject ?? '', variables)
      : request.subject;
    const html = isAtlasRendered && meta.html ? this.templateRenderer.render(meta.html, variables) : meta.html;
    const text =
      isAtlasRendered && (meta.text ?? request.body)
        ? this.templateRenderer.render(meta.text ?? request.body ?? '', variables)
        : meta.text ?? request.body;

    const payload: IEmailProviderRequestPayload = {
      from: {
        address: meta.fromAddress ?? state.settings.defaultFromAddress ?? '',
        name: meta.fromName ?? state.settings.defaultFromName,
      },
      to: request.recipients.map((r) => ({ address: r.address, name: r.name })),
      cc: meta.cc,
      bcc: meta.bcc,
      replyTo: meta.replyTo,
      subject,
      html,
      text,
      templateId: !isAtlasRendered ? request.template?.templateId : undefined,
      templateVariables: !isAtlasRendered ? variables : undefined,
      attachments: request.attachments?.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        content: a.contentBase64,
        url: a.url,
      })),
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

      const response = await axios.request<IEmailProviderResponsePayload>({
        method: state.settings.httpMethod ?? 'POST',
        url: state.settings.apiBaseUrl,
        headers,
        auth: state.basicAuth,
        data: payload,
      });

      const providerRef = this.extractField(
        response.data,
        state.settings.messageIdResponsePath,
        ['messageId', 'id', 'MessageId'],
      );
      const rawStatus = this.extractField(response.data, state.settings.statusResponsePath, [
        'status',
        'Status',
      ]);
      const status =
        rawStatus
          ? (STATUS_MAP[String(rawStatus).toLowerCase()] ?? NotificationDeliveryStatus.SENT)
          : NotificationDeliveryStatus.SENT;

      return {
        providerKey: EMAIL_ADAPTER_PROVIDER_KEY,
        channel: NotificationProviderChannel.EMAIL,
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

  private extractField(
    data: IEmailProviderResponsePayload,
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
      return new NotificationProviderTimeoutException(EMAIL_ADAPTER_PROVIDER_KEY, 0);
    }

    const status = err.response?.status;
    if (status === 429) {
      return new NotificationProviderRateLimitedException(EMAIL_ADAPTER_PROVIDER_KEY);
    }
    if (!err.response || (status && status >= 500)) {
      return new NotificationProviderUnavailableException(EMAIL_ADAPTER_PROVIDER_KEY);
    }

    return new NotificationProviderRequestFailedException(
      EMAIL_ADAPTER_PROVIDER_KEY,
      err.message ?? 'Unknown email provider error',
    );
  }
}
