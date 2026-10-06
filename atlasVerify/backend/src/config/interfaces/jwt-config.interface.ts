export interface IJwtConfig {
  readonly secret: string;
  readonly expiresIn: string;
  readonly refreshSecret: string;
  readonly refreshExpiresIn: string;
}
