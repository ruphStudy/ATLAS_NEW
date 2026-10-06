import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { TOTP_ISSUER, TOTP_WINDOW } from './mfa.constants';

authenticator.options = { window: TOTP_WINDOW };

/**
 * Thin wrapper around otplib's `authenticator` preset — the only place in
 * ATLAS that touches the otplib API directly, so the TOTP algorithm choice
 * stays swappable without touching call sites. Never logs a secret or code.
 */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  generateOtpAuthUrl(accountEmail: string, secret: string): string {
    return authenticator.keyuri(accountEmail, TOTP_ISSUER, secret);
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch {
      // otplib throws on a malformed token (e.g. non-numeric) — treat as invalid, not a server error.
      return false;
    }
  }
}
