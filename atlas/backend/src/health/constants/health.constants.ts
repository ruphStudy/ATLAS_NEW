export const HEALTH_CONSTANTS = {
  APP_NAME: 'ATLAS',
  CHECK_TIMEOUT_MS: 5_000,
} as const;

/**
 * Overall application health status.
 *
 * UP       – all critical services are reachable.
 * DEGRADED – one or more non-critical services are unreachable.
 * DOWN     – all critical services are unreachable.
 */
export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  DEGRADED = 'DEGRADED',
}

/**
 * Per-service health status.
 */
export enum ServiceStatus {
  UP = 'UP',
  DOWN = 'DOWN',
}
