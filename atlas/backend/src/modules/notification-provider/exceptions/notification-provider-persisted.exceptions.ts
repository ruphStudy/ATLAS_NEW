import { HttpStatus } from '@nestjs/common';
import { AtlasException, ErrorCode } from '@common/exceptions';

// ── Registry ─────────────────────────────────────────────────────────
export class NotificationProviderRegistryEntryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification provider registry entry '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_REGISTRY_ENTRY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationProviderRegistryEntryDuplicateException extends AtlasException {
  constructor(providerKey: string) {
    super({
      message: `Registry entry for provider '${providerKey}' already exists in this scope`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_REGISTRY_ENTRY_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NotificationProviderRegistryInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition registry entry from '${from}' to '${to}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_REGISTRY_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

// ── Configuration ────────────────────────────────────────────────────
export class NotificationProviderConfigNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification provider config '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CONFIG_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationProviderConfigDuplicateException extends AtlasException {
  constructor(providerKey: string, channel: string) {
    super({
      message: `A config for provider '${providerKey}' on channel '${channel}' already exists in this workspace`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CONFIG_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NotificationProviderConfigInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition notification provider config from '${from}' to '${to}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CONFIG_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderConfigHistoryVersionNotFoundException extends AtlasException {
  constructor(configId: string, version: number) {
    super({
      message: `Version ${version} not found for notification provider config '${configId}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CONFIG_HISTORY_VERSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

// ── Credentials ──────────────────────────────────────────────────────
export class NotificationProviderCredentialNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification provider credential '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationProviderCredentialDuplicateException extends AtlasException {
  constructor(providerKey: string, credentialSetName: string) {
    super({
      message: `Credential set '${credentialSetName}' for provider '${providerKey}' already exists in this workspace`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NotificationProviderCredentialInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition credential from '${from}' to '${to}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderCredentialDecryptionException extends AtlasException {
  constructor(scope: string) {
    super({
      message: `Failed to decrypt notification provider credential (${scope})`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_DECRYPTION_FAILED,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}

export class NotificationProviderCredentialExpiredException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification provider credential '${id}' has expired`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_EXPIRED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderCredentialRevokedException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification provider credential '${id}' has been revoked`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_REVOKED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

export class NotificationProviderCredentialHistoryVersionNotFoundException extends AtlasException {
  constructor(credentialId: string, version: number) {
    super({
      message: `Version ${version} not found for notification provider credential '${credentialId}'`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_HISTORY_VERSION_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationProviderCredentialConnectionValidationException extends AtlasException {
  constructor(providerKey: string, message: string) {
    super({
      message: `Connection validation failed for provider '${providerKey}': ${message}`,
      errorCode: ErrorCode.NOTIFICATION_PROVIDER_CREDENTIAL_CONNECTION_VALIDATION_FAILED,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}

// ── Delivery ─────────────────────────────────────────────────────────
export class NotificationDeliveryNotFoundException extends AtlasException {
  constructor(id: string) {
    super({
      message: `Notification delivery '${id}' not found`,
      errorCode: ErrorCode.NOTIFICATION_DELIVERY_NOT_FOUND,
      statusCode: HttpStatus.NOT_FOUND,
    });
  }
}

export class NotificationDeliveryDuplicateException extends AtlasException {
  constructor(idempotencyKey: string) {
    super({
      message: `A delivery with idempotency key '${idempotencyKey}' already exists in this workspace`,
      errorCode: ErrorCode.NOTIFICATION_DELIVERY_DUPLICATE,
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class NotificationDeliveryInvalidTransitionException extends AtlasException {
  constructor(from: string, to: string) {
    super({
      message: `Cannot transition delivery from '${from}' to '${to}'`,
      errorCode: ErrorCode.NOTIFICATION_DELIVERY_INVALID_TRANSITION,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }
}
