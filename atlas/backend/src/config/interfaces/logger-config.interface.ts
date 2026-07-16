import type { LogLevel } from '../enums';

export interface ILoggerConfig {
  readonly level: LogLevel;
  readonly prettyPrint: boolean;
}
