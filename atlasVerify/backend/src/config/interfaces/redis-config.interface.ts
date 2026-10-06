export interface IRedisConfig {
  readonly host: string;
  readonly port: number;
  readonly password: string | undefined;
}
