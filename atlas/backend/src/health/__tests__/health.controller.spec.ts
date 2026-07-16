import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, Logger } from '@nestjs/common';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { HealthStatus, ServiceStatus } from '../constants';
import type { IHealthCheckResult, ILivenessResult, IReadinessResult } from '../interfaces';
import { NodeEnvironment } from '@config/enums';

// ── Mock helpers ──────────────────────────────────────────────
function buildMockRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown as import('express').Response, status, json };
}

const MOCK_HEALTH_UP: IHealthCheckResult = {
  status: HealthStatus.UP,
  application: 'ATLAS',
  version: '1.0',
  environment: NodeEnvironment.DEVELOPMENT,
  uptime: '1m 5s',
  uptimeSeconds: 65,
  timestamp: '2026-07-14T10:00:00.000Z',
  services: { database: ServiceStatus.UP, redis: ServiceStatus.UP },
};

const MOCK_HEALTH_DEGRADED: IHealthCheckResult = {
  ...MOCK_HEALTH_UP,
  status: HealthStatus.DEGRADED,
  services: { database: ServiceStatus.DOWN, redis: ServiceStatus.UP },
};

const MOCK_HEALTH_DOWN: IHealthCheckResult = {
  ...MOCK_HEALTH_UP,
  status: HealthStatus.DOWN,
  services: { database: ServiceStatus.DOWN, redis: ServiceStatus.DOWN },
};

const MOCK_LIVENESS: ILivenessResult = {
  alive: true,
  timestamp: '2026-07-14T10:00:00.000Z',
  uptimeSeconds: 65,
};

const MOCK_READINESS_OK: IReadinessResult = {
  ready: true,
  status: HealthStatus.UP,
  timestamp: '2026-07-14T10:00:00.000Z',
  services: { database: ServiceStatus.UP, redis: ServiceStatus.UP },
};

const MOCK_READINESS_FAIL: IReadinessResult = {
  ready: false,
  status: HealthStatus.DEGRADED,
  timestamp: '2026-07-14T10:00:00.000Z',
  services: { database: ServiceStatus.DOWN, redis: ServiceStatus.UP },
};

// ── Test Suite ─────────────────────────────────────────────────
describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn(),
            getLiveness: jest.fn(),
            getReadiness: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── GET /health ─────────────────────────────────────────────
  describe('check() – GET /health', () => {
    it('should return 200 and success=true when status is UP', async () => {
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_UP);
      const { res, status, json } = buildMockRes();

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, status: HealthStatus.UP }),
      );
    });

    it('should return 200 and success=true when status is DEGRADED', async () => {
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_DEGRADED);
      const { res, status, json } = buildMockRes();

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, status: HealthStatus.DEGRADED }),
      );
    });

    it('should return 503 and success=false when status is DOWN', async () => {
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_DOWN);
      const { res, status, json } = buildMockRes();

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, status: HealthStatus.DOWN }),
      );
    });

    it('should include all service statuses in the response body', async () => {
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_UP);
      const { res, json } = buildMockRes();

      await controller.check(res);

      const body = (json.mock.calls[0] as [Record<string, unknown>])[0];
      expect(body['services']).toEqual({
        database: ServiceStatus.UP,
        redis: ServiceStatus.UP,
      });
    });

    it('should call healthService.getHealth() exactly once', async () => {
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_UP);
      const { res } = buildMockRes();

      await controller.check(res);

      expect(healthService.getHealth).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /health/live ─────────────────────────────────────────
  describe('live() – GET /health/live', () => {
    it('should always return 200 with success=true', () => {
      healthService.getLiveness.mockReturnValue(MOCK_LIVENESS);
      const { res, status, json } = buildMockRes();

      controller.live(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, alive: true }),
      );
    });

    it('should include uptimeSeconds in the response', () => {
      healthService.getLiveness.mockReturnValue(MOCK_LIVENESS);
      const { res, json } = buildMockRes();

      controller.live(res);

      const body = (json.mock.calls[0] as [Record<string, unknown>])[0];
      expect(typeof body['uptimeSeconds']).toBe('number');
    });

    it('should call healthService.getLiveness() exactly once', () => {
      healthService.getLiveness.mockReturnValue(MOCK_LIVENESS);
      const { res } = buildMockRes();

      controller.live(res);

      expect(healthService.getLiveness).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /health/ready ────────────────────────────────────────
  describe('ready() – GET /health/ready', () => {
    it('should return 200 when readiness check passes', async () => {
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_OK);
      const { res, status, json } = buildMockRes();

      await controller.ready(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, ready: true }),
      );
    });

    it('should return 503 when readiness check fails', async () => {
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_FAIL);
      const { res, status, json } = buildMockRes();

      await controller.ready(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, ready: false }),
      );
    });

    it('should include service statuses in the readiness response', async () => {
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_OK);
      const { res, json } = buildMockRes();

      await controller.ready(res);

      const body = (json.mock.calls[0] as [Record<string, unknown>])[0];
      expect(body['services']).toEqual({
        database: ServiceStatus.UP,
        redis: ServiceStatus.UP,
      });
    });

    it('should call healthService.getReadiness() exactly once', async () => {
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_OK);
      const { res } = buildMockRes();

      await controller.ready(res);

      expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
    });

    it('should return success=false when status is DEGRADED', async () => {
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_FAIL);
      const { res, json } = buildMockRes();

      await controller.ready(res);

      const body = (json.mock.calls[0] as [Record<string, unknown>])[0];
      expect(body['success']).toBe(false);
    });
  });
});

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const mockHealthService = {
      getHealth: jest.fn().mockResolvedValue(MOCK_HEALTH_UP),
      getLiveness: jest.fn().mockReturnValue(MOCK_LIVENESS),
      getReadiness: jest.fn().mockResolvedValue(MOCK_READINESS_OK),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── GET /health ─────────────────────────────────────────────
  describe('check() – GET /health', () => {
    it('should return 200 when status is UP', async () => {
      const { res, status, json } = buildMockRes();
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_UP);

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should return 200 when status is DEGRADED', async () => {
      const { res, status } = buildMockRes();
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_DEGRADED);

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 503 when status is DOWN', async () => {
      const { res, status, json } = buildMockRes();
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_DOWN);

      await controller.check(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('should spread health result into the response body', async () => {
      const { res, status, json } = buildMockRes();
      healthService.getHealth.mockResolvedValue(MOCK_HEALTH_UP);

      await controller.check(res);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          application: 'ATLAS',
          services: { database: ServiceStatus.UP, redis: ServiceStatus.UP },
        }),
      );
    });

    it('should call healthService.getHealth exactly once', async () => {
      const { res } = buildMockRes();
      await controller.check(res);
      expect(healthService.getHealth).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /health/live ────────────────────────────────────────
  describe('live() – GET /health/live', () => {
    it('should always return 200', () => {
      const { res, status } = buildMockRes();
      controller.live(res);
      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should include success=true in the response', () => {
      const { res, json } = buildMockRes();
      controller.live(res);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true, alive: true }));
    });

    it('should call getLiveness synchronously without awaiting', () => {
      const { res } = buildMockRes();
      controller.live(res);
      expect(healthService.getLiveness).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /health/ready ───────────────────────────────────────
  describe('ready() – GET /health/ready', () => {
    it('should return 200 when application is ready', async () => {
      const { res, status } = buildMockRes();
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_OK);

      await controller.ready(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return 503 when application is not ready', async () => {
      const { res, status, json } = buildMockRes();
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_FAIL);

      await controller.ready(res);

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false, ready: false }));
    });

    it('should include service statuses in the response body', async () => {
      const { res, json } = buildMockRes();
      healthService.getReadiness.mockResolvedValue(MOCK_READINESS_OK);

      await controller.ready(res);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          services: { database: ServiceStatus.UP, redis: ServiceStatus.UP },
        }),
      );
    });
  });
});
