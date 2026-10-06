import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { HealthStatus } from './constants';
import { HealthResponseDto, LivenessResponseDto, ReadinessResponseDto } from './dto';

/**
 * HealthController
 *
 * Exposes three endpoints designed for Kubernetes health probes and
 * monitoring systems (Datadog, Prometheus, Uptime Robot, etc.).
 *
 * Uses @Res() to bypass the global TransformInterceptor so the
 * response matches the required health envelope exactly.
 *
 * Routes (versioned):
 *   GET /api/v1/health        – full health report
 *   GET /api/v1/health/live   – liveness probe
 *   GET /api/v1/health/ready  – readiness probe
 */
@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  // ── GET /health ──────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Full health report',
    description:
      'Returns application health with status of all downstream services. ' +
      'Returns 200 when UP or DEGRADED, 503 when DOWN.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application is UP or DEGRADED',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Application is DOWN – all critical services unreachable',
    type: HealthResponseDto,
  })
  async check(@Res() res: Response): Promise<void> {
    const health = await this.healthService.getHealth();
    const statusCode =
      health.status === HealthStatus.DOWN
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;

    res.status(statusCode).json({
      success: health.status !== HealthStatus.DOWN,
      ...health,
    });
  }

  // ── GET /health/live ─────────────────────────────────────────

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe. Returns 200 as long as the Node.js process is alive. ' +
      'If this returns non-200, Kubernetes restarts the pod.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Process alive',
    type: LivenessResponseDto,
  })
  live(@Res() res: Response): void {
    const result = this.healthService.getLiveness();
    res.status(HttpStatus.OK).json({ success: true, ...result });
  }

  // ── GET /health/ready ────────────────────────────────────────

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Kubernetes readiness probe. Returns 200 when ready to serve traffic, ' +
      '503 when database or Redis are unavailable. ' +
      'Kubernetes will stop sending traffic to the pod when this returns 503.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application ready to serve traffic',
    type: ReadinessResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Application not ready – downstream dependency unavailable',
    type: ReadinessResponseDto,
  })
  async ready(@Res() res: Response): Promise<void> {
    const result = await this.healthService.getReadiness();
    const statusCode = result.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(statusCode).json({ success: result.ready, ...result });
  }
}
