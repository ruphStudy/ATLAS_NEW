/**
 * Configuration-driven contract for the generic WhatsApp adapter. Every
 * field here comes from `NotificationProviderConfig.settings`
 * (workspace-specific, versioned) — nothing about a specific vendor/BSP's
 * wire format is hardcoded in the adapter itself, only this envelope's
 * shape.
 */
export interface IWhatsAppProviderSettings {
  /** REST endpoint the adapter POSTs the send envelope to. */
  apiBaseUrl: string;
  httpMethod?: 'POST' | 'PUT';

  authType?: 'BEARER' | 'API_KEY_HEADER' | 'BASIC' | 'NONE';
  authHeaderName?: string;
  authValuePrefix?: string;
  apiKeyField?: string;
  usernameField?: string;
  passwordField?: string;

  /** The Business/sender phone identifier used as the "from" of the message (BSP-specific: phone number id, sender name, etc). */
  senderPhoneId?: string;
  defaultCountryCode?: string;

  /**
   * Enforce "approved template required outside an active session" (the
   * WhatsApp Business API 24-hour customer-service-window rule). Defaults
   * to true — set false only for BSPs/sandboxes that don't enforce it.
   */
  requireApprovedTemplateOutsideSession?: boolean;

  messageIdResponsePath?: string;
  statusResponsePath?: string;
  /** Dot-path to an array of per-message status objects in a webhook payload, for BSPs that batch multiple updates per callback (e.g. Meta Cloud API's `entry[].changes[].value.statuses[]`). */
  statusArrayPath?: string;

  healthCheckUrl?: string;
  healthCheckMethod?: 'GET' | 'HEAD';

  /** Which decrypted credential field holds the shared secret used to verify inbound webhooks. Defaults to 'webhookSecret'. */
  webhookSecretField?: string;
  webhookSignatureAlgorithm?: 'HMAC_SHA256' | 'HMAC_SHA1';
  /** Request header carrying the vendor's signature. Defaults to 'x-hub-signature-256'. */
  webhookSignatureHeader?: string;
  /** Which decrypted credential field holds the webhook handshake verify-token (Meta Cloud API `hub.verify_token`). Defaults to 'verifyToken'. */
  webhookVerifyTokenField?: string;

  extraHeaders?: Record<string, string>;
}

/**
 * WhatsApp-specific fields the adapter reads out of the generic
 * `INotificationSendRequest.metadata` bag — populated by
 * NotificationDeliveryService from `SendNotificationDto.countryCode` and
 * `.metadata.interactive`/`.sessionActive` passthrough.
 */
export interface IWhatsAppSendMetadata {
  countryCode?: string;
  templateSource?: 'ATLAS' | 'PROVIDER';
  /** Caller-asserted: recipient is within an active 24h customer-service session, so free-text (non-template) content is compliant. */
  sessionActive?: boolean;
  /** Buttons / list / interactive message descriptor, passed through to the provider as-is. */
  interactive?: IWhatsAppInteractiveMessage;
}

export interface IWhatsAppInteractiveButton {
  id: string;
  title: string;
}

export interface IWhatsAppInteractiveMessage {
  type: 'button' | 'list';
  bodyText?: string;
  buttons?: IWhatsAppInteractiveButton[];
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}

/** The generic JSON envelope POSTed to `settings.apiBaseUrl`. */
export interface IWhatsAppProviderRequestPayload {
  from?: string;
  to: string;
  text?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  media?: Array<{ filename: string; contentType: string; content?: string; url?: string }>;
  interactive?: IWhatsAppInteractiveMessage;
  idempotencyKey?: string;
}

/** Loosely-typed provider response — field extraction is path-configurable, see IWhatsAppProviderSettings. */
export type IWhatsAppProviderResponsePayload = Record<string, unknown>;
