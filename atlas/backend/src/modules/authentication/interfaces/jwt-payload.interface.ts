export interface IJwtPayload {
  /** User UUID */
  sub: string;
  email: string;
  workspaceId: string;
  role: string;
  /** Distinguishes access tokens from refresh tokens */
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/** Signed, short-lived, and deliberately minimal — carries no email/role/secret, only the user id needed to resume login after TOTP verification. */
export interface IMfaChallengePayload {
  sub: string;
  type: 'mfa_challenge';
  iat?: number;
  exp?: number;
}
