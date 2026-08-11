/**
 * Configuration-driven contract for the generic SMS adapter. Every field
 * here comes from `NotificationProviderConfig.settings` (workspace-specific,
 * versioned) — nothing about a specific vendor's wire format is hardcoded in
 * the adapter itself, only this envelope's shape.
 */
export interface ISmsProviderSettings {
  /** REST endpoint the adapter POSTs the send envelope to. */
  apiBaseUrl: string;
  httpMethod?: 'POST' | 'PUT';

  authType?: 'BEARER' | 'API_KEY_HEADER' | 'BASIC' | 'NONE';
  authHeaderName?: string;
  authValuePrefix?: string;
  apiKeyField?: string;
  usernameField?: string;
  passwordField?: string;

  defaultSenderId?: string;
  defaultCountryCode?: string;

  messageIdResponsePath?: string;
  statusResponsePath?: string;

  healthCheckUrl?: string;
  healthCheckMethod?: 'GET' | 'HEAD';

  /** Which decrypted credential field holds the shared secret used to verify inbound delivery-receipt webhooks. Defaults to 'webhookSecret'. */
  webhookSecretField?: string;
  /** 'HMAC_SHA256' (default) or 'HMAC_SHA1'. */
  webhookSignatureAlgorithm?: 'HMAC_SHA256' | 'HMAC_SHA1';
  /** Request header carrying the vendor's signature. Defaults to 'x-signature'. */
  webhookSignatureHeader?: string;

  extraHeaders?: Record<string, string>;
}

/**
 * SMS-specific fields the adapter reads out of the generic
 * `INotificationSendRequest.metadata` bag — populated by
 * NotificationDeliveryService from `SendNotificationDto.senderId/countryCode`.
 */
export interface ISmsSendMetadata {
  senderId?: string;
  countryCode?: string;
  templateSource?: 'ATLAS' | 'PROVIDER';
}

/** The generic JSON envelope POSTed to `settings.apiBaseUrl`. */
export interface ISmsProviderRequestPayload {
  senderId?: string;
  to: string;
  body?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  idempotencyKey?: string;
}

/** Loosely-typed provider response — field extraction is path-configurable, see ISmsProviderSettings. */
export type ISmsProviderResponsePayload = Record<string, unknown>;
