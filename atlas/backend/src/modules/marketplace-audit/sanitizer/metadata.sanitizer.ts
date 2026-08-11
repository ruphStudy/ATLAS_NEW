import { Injectable } from '@nestjs/common';

@Injectable()
export class MetadataSanitizer {
  private readonly sensitiveKeys = [
    'password',
    'secret',
    'token',
    'key',
    'credential',
    'authorization',
    'auth',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'client_secret',
    'private_key',
    'passphrase',
    'salt',
    'hash',
    'signature',
    'bearer',
    'oauth',
  ];

  sanitize(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (this.isSensitiveValue(value)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === 'object' && item !== null
              ? this.sanitize(item)
              : item,
          );
        } else {
          sanitized[key] = this.sanitize(value);
        }
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  sanitizeChangeReference(change?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changedFields?: string[];
  }): {
    before?: Record<string, any>;
    after?: Record<string, any>;
    changedFields?: string[];
  } | undefined {
    if (!change) return undefined;

    return {
      before: change.before ? this.sanitize(change.before) : undefined,
      after: change.after ? this.sanitize(change.after) : undefined,
      changedFields: change.changedFields,
    };
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.sensitiveKeys.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey),
    );
  }

  private isSensitiveValue(value: any): boolean {
    if (typeof value !== 'string') return false;

    // Check for JWT patterns
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
      return true;
    }

    // Check for Base64 encoded secrets (long strings)
    if (value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value)) {
      return true;
    }

    // Check for hex encoded secrets (long hex strings)
    if (value.length > 64 && /^[a-fA-F0-9]+$/.test(value)) {
      return true;
    }

    return false;
  }

  extractSafeFields(data?: Record<string, any>): string[] {
    if (!data) return [];

    const safeFields: string[] = [];

    for (const key of Object.keys(data)) {
      if (!this.isSensitiveKey(key)) {
        safeFields.push(key);
      }
    }

    return safeFields;
  }
}
