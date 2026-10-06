import type { HealthStatus, ServiceStatus } from '../constants';

export interface IServiceCheckResult {
  readonly status: ServiceStatus;
  readonly responseTimeMs: number;
  readonly error?: string;
}

export interface IServicesStatus {
  readonly database: ServiceStatus;
  readonly redis: ServiceStatus;
}

export interface IHealthCheckResult {
  readonly status: HealthStatus;
  readonly application: string;
  readonly version: string;
  readonly environment: string;
  readonly uptime: string;
  readonly uptimeSeconds: number;
  readonly timestamp: string;
  readonly services: IServicesStatus;
}

export interface ILivenessResult {
  readonly alive: boolean;
  readonly timestamp: string;
  readonly uptimeSeconds: number;
}

export interface IReadinessResult {
  readonly ready: boolean;
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly services: IServicesStatus;
}
