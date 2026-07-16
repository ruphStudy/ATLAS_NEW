import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthService } from '../health.service';
import { HealthStatus, ServiceStatus } from '../constants';
import { PrismaService } from '@database/prisma.service';
import { ConfigurationService } from '@config/configuration.service';
import { NodeEnvironment } from '@config/enums';

// ── Mock ioredis ──────────────────────────────────────────────
let mockPing = jest.fn().mockResolvedValue('PONG');

const MockRedis = jest.fn().mockImplementation(() => ({
  ping: (...args: unknown[]) => mockPing(...args),
  quit: jest.fn().mockResolvedValue('OK'),
  disconnect: jest.fn(),
  on: jest.fn(),
}));

jest.mock('ioredis', () => ({
  __esModule: true,
  default: MockRedis,
}));

// ── Mock data ─────────────────────────────────────────────────
const MOCK_REDIS_CONFIG = { host: 'localhost', port: 6379, password: undefined };

const MOCK_CONFIG_SERVICE = {
  getAppConfig: () => ({
    name: 'ATLAS API',
    env: NodeEnvironment.DEVELOPMENT,
    port: 3001,
    apiPrefix: 'api',
    apiVersion: '1',
    corsOrigins: ['http://localhost:3000'],
    throttle: { ttl: 60, limit: 100 },
  }),
  getRedisConfig: () => MOCK_REDIS_CONFIG,
  getSwaggerConfig: () => ({
    enabled: true,
    title: 'ATLAS API',
    description: 'Test',
    version: '1.0',
    path: 'api/docs',
  }),
};

// ── Test Suite ─────────────────────────────────────────────────
describe('HealthService', () => {
  let service: HealthService;
  let mockPrismaQueryRaw: jest.Mock;

  beforeEach(async () => {
    mockPrismaQueryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    mockPing = jest.fn().mockResolvedValue('PONG');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: mockPrismaQueryRaw },
        },
        {
          provide: ConfigurationService,
          useValue: MOCK_CONFIG_SERVICE,
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    service = module.get<HealthService>(HealthService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  // ── getHealth() ─────────────────────────────────────────────
  describe('getHealth()', () => {
    it('should return UP when database and Redis are healthy', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe(HealthStatus.UP);
      expect(result.services.database).toBe(ServiceStatus.UP);
      expect(result.services.redis).toBe(ServiceStatus.UP);
    });

    it('should return DEGRADED when only the database is down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('Connection refused'));

      const result = await service.getHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.services.database).toBe(ServiceStatus.DOWN);
      expect(result.services.redis).toBe(ServiceStatus.UP);
    });

    it('should return DEGRADED when only Redis is down', async () => {
      mockPing.mockRejectedValue(new Error('Redis ECONNREFUSED'));

      const result = await service.getHealth();

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.services.database).toBe(ServiceStatus.UP);
      expect(result.services.redis).toBe(ServiceStatus.DOWN);
    });

    it('should return DOWN when both database and Redis are down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('DB error'));
      mockPing.mockRejectedValue(new Error('Redis error'));

      const result = await service.getHealth();

      expect(result.status).toBe(HealthStatus.DOWN);
      expect(result.services.database).toBe(ServiceStatus.DOWN);
      expect(result.services.redis).toBe(ServiceStatus.DOWN);
    });

    it('should include all required fields in the response', async () => {
      const result = await service.getHealth();

      expect(result.application).toBe('ATLAS');
      expect(result.version).toBe('1.0');
      expect(result.environment).toBe(NodeEnvironment.DEVELOPMENT);
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptimeSeconds).toBe('number');
    });

    it('should never throw even if both services fail', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('DB fatal error'));
      mockPing.mockRejectedValue(new Error('Redis fatal error'));

      await expect(service.getHealth()).resolves.toBeDefined();
    });
  });

  // ── getLiveness() ───────────────────────────────────────────
  describe('getLiveness()', () => {
    it('should return alive=true synchronously', () => {
      const result = service.getLiveness();

      expect(result.alive).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.uptimeSeconds).toBe('number');
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should return a valid ISO timestamp', () => {
      const result = service.getLiveness();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  // ── getReadiness() ──────────────────────────────────────────
  describe('getReadiness()', () => {
    it('should return ready=true when all services are healthy', async () => {
      const result = await service.getReadiness();

      expect(result.ready).toBe(true);
      expect(result.status).toBe(HealthStatus.UP);
    });

    it('should return ready=false when database is down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('DB unavailable'));

      const result = await service.getReadiness();

      expect(result.ready).toBe(false);
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.services.database).toBe(ServiceStatus.DOWN);
    });

    it('should return ready=false when Redis is down', async () => {
      mockPing.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.getReadiness();

      expect(result.ready).toBe(false);
    });

    it('should never throw', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('fatal'));
      mockPing.mockRejectedValue(new Error('fatal'));

      await expect(service.getReadiness()).resolves.toBeDefined();
    });
  });

  // ── Uptime formatting ────────────────────────────────────────
  describe('formatUptime (via getHealth)', () => {
    it('should include uptime as a non-empty string', async () => {
      const result = await service.getHealth();
      expect(result.uptime.length).toBeGreaterThan(0);
    });
  });
});
