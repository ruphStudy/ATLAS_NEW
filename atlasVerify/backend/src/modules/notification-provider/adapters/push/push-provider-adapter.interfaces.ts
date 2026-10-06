/**
 * Configuration-driven contract for the generic push adapter. Every field
 * here comes from `NotificationProviderConfig.settings` (workspace-specific,
 * versioned) — nothing about a specific vendor's wire format (FCM/APNs/Web
 * Push/etc) is hardcoded in the adapter itself, only this envelope's shape.
 */
export interface IPushProviderSettings {
  /** REST endpoint the adapter POSTs the send envelope to. */
  apiBaseUrl: string;
  httpMethod?: 'POST' | 'PUT';

  authType?: 'BEARER' | 'API_KEY_HEADER' | 'BASIC' | 'NONE';
  authHeaderName?: string;
  authValuePrefix?: string;
  apiKeyField?: string;
  usernameField?: string;
  passwordField?: string;

  messageIdResponsePath?: string;
  statusResponsePath?: string;
  /** Dot-path to a per-recipient error/invalid-token code in the response, for detecting unregistered tokens synchronously. */
  invalidTokenResponsePath?: string;
  /** Provider error codes that mean "this token is no longer valid" (e.g. FCM's 'UNREGISTERED', 'INVALID_ARGUMENT'; APNs' 'BadDeviceToken'). */
  invalidTokenErrorCodes?: string[];

  healthCheckUrl?: string;
  healthCheckMethod?: 'GET' | 'HEAD';

  webhookSecretField?: string;
  webhookSignatureAlgorithm?: 'HMAC_SHA256' | 'HMAC_SHA1';
  webhookSignatureHeader?: string;

  extraHeaders?: Record<string, string>;
}

/**
 * Push-specific fields the adapter reads out of the generic
 * `INotificationSendRequest.metadata` bag — populated by
 * `PushSendService` from `SendPushNotificationDto`.
 */
export interface IPushSendMetadata {
  image?: string;
  icon?: string;
  sound?: string;
  badge?: number;
  deepLink?: string;
  actions?: IPushAction[];
  data?: Record<string, unknown>;
  platform?: string;
}

export interface IPushAction {
  id: string;
  title: string;
  icon?: string;
}

/** The generic JSON envelope POSTed to `settings.apiBaseUrl`. */
export interface IPushProviderRequestPayload {
  to: string;
  title?: string;
  body?: string;
  image?: string;
  icon?: string;
  sound?: string;
  badge?: number;
  deepLink?: string;
  actions?: IPushAction[];
  data?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** Loosely-typed provider response — field extraction is path-configurable, see IPushProviderSettings. */
export type IPushProviderResponsePayload = Record<string, unknown>;
