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
