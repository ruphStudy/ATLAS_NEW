import type { NodeEnvironment } from '../enums';

export interface IAppConfig {
  readonly name: string;
  readonly env: NodeEnvironment;
  readonly port: number;
  readonly apiPrefix: string;
  readonly apiVersion: string;
  readonly corsOrigins: string[];
  readonly throttle: {
    readonly ttl: number;    // seconds
    readonly limit: number;  // max requests per ttl window
  };
}
