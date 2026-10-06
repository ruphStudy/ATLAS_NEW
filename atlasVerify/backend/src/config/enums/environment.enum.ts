/**
 * Application environment enumeration.
 * Used to enforce type-safe NODE_ENV values across the codebase.
 */
export enum NodeEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
  STAGING = 'staging',
}

/**
 * Pino-compatible log level enumeration.
 * Maps directly to valid pino log levels.
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
  SILENT = 'silent',
}
