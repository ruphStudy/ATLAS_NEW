/**
 * Configuration-driven contract for the generic email adapter. Every field
 * here comes from `NotificationProviderConfig.settings` (workspace-specific,
 * versioned) — nothing about a specific vendor's wire format is hardcoded in
 * the adapter itself, only this envelope's shape.
 */
export interface IEmailProviderSettings {
  /** REST endpoint the adapter POSTs the send envelope to. */
  apiBaseUrl: string;
  httpMethod?: 'POST' | 'PUT';

  authType?: 'BEARER' | 'API_KEY_HEADER' | 'BASIC' | 'NONE';
  /** Header name carrying the credential, e.g. 'Authorization' or 'X-Api-Key'. Defaults to 'Authorization'. */
  authHeaderName?: string;
  /** Prefix prepended to the credential value, e.g. 'Bearer '. */
  authValuePrefix?: string;
  /** Which decrypted credential field holds the API key/secret. Defaults to 'apiKey'. */
  apiKeyField?: string;
  /** For BASIC auth: which decrypted credential field holds the username. Defaults to 'username'. */
  usernameField?: string;
  /** For BASIC auth: which decrypted credential field holds the password. Defaults to 'password'. */
  passwordField?: string;

  defaultFromAddress?: string;
  defaultFromName?: string;

  /** Dot-path into the provider's JSON response where the message id lives. Defaults to trying 'messageId', 'id', 'MessageId' in order. */
  messageIdResponsePath?: string;
  /** Dot-path into the provider's JSON response where a status string lives. Defaults to trying 'status', 'Status'. */
  statusResponsePath?: string;

  /** Optional lightweight endpoint used for health checks; if absent, health defaults to HEALTHY once initialized. */
  healthCheckUrl?: string;
  healthCheckMethod?: 'GET' | 'HEAD';

  extraHeaders?: Record<string, string>;
}

/**
 * Email-specific fields the adapter reads out of the generic
 * `INotificationSendRequest.metadata` bag — see
 * NotificationDeliveryService, which is what actually populates these from
 * `SendNotificationDto.cc/bcc/replyTo/fromAddress/fromName/html/text`. Kept
 * out of the channel-agnostic foundation contract on purpose.
 */
export interface IEmailSendMetadata {
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  fromAddress?: string;
  fromName?: string;
  templateSource?: 'ATLAS' | 'PROVIDER';
}

/** The generic JSON envelope POSTed to `settings.apiBaseUrl`. */
export interface IEmailProviderRequestPayload {
  from: { address: string; name?: string };
  to: Array<{ address: string; name?: string }>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  attachments?: Array<{ filename: string; contentType: string; content?: string; url?: string }>;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/** Loosely-typed provider response — field extraction is path-configurable, see IEmailProviderSettings. */
export type IEmailProviderResponsePayload = Record<string, unknown>;
