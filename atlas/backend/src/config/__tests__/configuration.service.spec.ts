import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from '../configuration.service';
import { NodeEnvironment, LogLevel } from '../enums';
import type {
  IAppConfig,
  IDatabaseConfig,
  IRedisConfig,
  IJwtConfig,
  ISwaggerConfig,
  IQueueConfig,
  ILoggerConfig,
} from '../interfaces';

// ── Mock Config Data ──────────────────────────────────────────
const MOCK_APP_CONFIG: IAppConfig = {
  name: 'ATLAS API',
  env: NodeEnvironment.DEVELOPMENT,
  port: 3001,
  apiPrefix: 'api',
  apiVersion: '1',
  corsOrigins: ['http://localhost:3000'],
  throttle: { ttl: 60, limit: 100 },
};

const MOCK_DATABASE_CONFIG: IDatabaseConfig = {
  url: 'postgresql://atlas_user:atlas_password@localhost:5432/atlas_test_db',
};

const MOCK_REDIS_CONFIG: IRedisConfig = {
  host: 'localhost',
  port: 6379,
  password: undefined,
  db: 0,
};

const MOCK_JWT_CONFIG: IJwtConfig = {
  secret: 'test-jwt-secret-minimum-32-characters-long!!',
  expiresIn: '7d',
  refreshSecret: 'test-refresh-secret-minimum-32-characters-long',
  refreshExpiresIn: '30d',
};

const MOCK_SWAGGER_CONFIG: ISwaggerConfig = {
  enabled: true,
  title: 'ATLAS API',
  description: 'ATLAS AI Commerce Operating System API',
  version: '1.0',
  path: 'api/docs',
};

const MOCK_QUEUE_CONFIG: IQueueConfig = {
  redis: { host: 'localhost', port: 6379, password: undefined },
};

const MOCK_LOGGER_CONFIG: ILoggerConfig = {
  level: LogLevel.DEBUG,
  prettyPrint: true,
};

const CONFIG_MAP: Record<string, unknown> = {
  app: MOCK_APP_CONFIG,
  database: MOCK_DATABASE_CONFIG,
  redis: MOCK_REDIS_CONFIG,
  jwt: MOCK_JWT_CONFIG,
  swagger: MOCK_SWAGGER_CONFIG,
  queue: MOCK_QUEUE_CONFIG,
  logger: MOCK_LOGGER_CONFIG,
};

// ── Tests ─────────────────────────────────────────────────────
describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mockConfigService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => CONFIG_MAP[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Environment Helpers ─────────────────────────────────────
  describe('environment helpers', () => {
    it('should report isDevelopment as true for development env', () => {
      expect(service.isDevelopment).toBe(true);
    });

    it('should report isProduction as false for development env', () => {
      expect(service.isProduction).toBe(false);
    });

    it('should report isTest as false for development env', () => {
      expect(service.isTest).toBe(false);
    });

    it('should report isStaging as false for development env', () => {
      expect(service.isStaging).toBe(false);
    });

    it('should report isProduction correctly for production env', () => {
      jest.spyOn(mockConfigService, 'get').mockImplementation((key: string) =>
        key === 'app'
          ? { ...MOCK_APP_CONFIG, env: NodeEnvironment.PRODUCTION }
          : CONFIG_MAP[key],
      );
      expect(service.isProduction).toBe(true);
      expect(service.isDevelopment).toBe(false);
    });
  });

  // ── getAppConfig ───────────────────────────────────────────
  describe('getAppConfig()', () => {
    it('should return the application config', () => {
      const config = service.getAppConfig();
      expect(config.name).toBe('ATLAS API');
      expect(config.port).toBe(3001);
      expect(config.env).toBe(NodeEnvironment.DEVELOPMENT);
      expect(config.corsOrigins).toContain('http://localhost:3000');
      expect(config.throttle.ttl).toBe(60);
      expect(config.throttle.limit).toBe(100);
    });

    it('should throw if app config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getAppConfig()).toThrow('Application config not found');
    });
  });

  // ── getDatabaseConfig ──────────────────────────────────────
  describe('getDatabaseConfig()', () => {
    it('should return the database config with a valid URL', () => {
      const config = service.getDatabaseConfig();
      expect(config.url).toContain('postgresql://');
    });

    it('should throw if database config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getDatabaseConfig()).toThrow('Database config not found');
    });
  });

  // ── getRedisConfig ─────────────────────────────────────────
  describe('getRedisConfig()', () => {
    it('should return the redis config', () => {
      const config = service.getRedisConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(6379);
      expect(config.password).toBeUndefined();
    });

    it('should throw if redis config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getRedisConfig()).toThrow('Redis config not found');
    });
  });

  // ── getJwtConfig ───────────────────────────────────────────
  describe('getJwtConfig()', () => {
    it('should return the JWT config with required fields', () => {
      const config = service.getJwtConfig();
      expect(config.secret).toBeDefined();
      expect(config.secret.length).toBeGreaterThanOrEqual(32);
      expect(config.expiresIn).toBe('7d');
      expect(config.refreshSecret).toBeDefined();
      expect(config.refreshExpiresIn).toBe('30d');
    });

    it('should throw if JWT config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getJwtConfig()).toThrow('JWT config not found');
    });
  });

  // ── getSwaggerConfig ───────────────────────────────────────
  describe('getSwaggerConfig()', () => {
    it('should return the swagger config', () => {
      const config = service.getSwaggerConfig();
      expect(config.enabled).toBe(true);
      expect(config.path).toBe('api/docs');
      expect(config.version).toBe('1.0');
    });

    it('should throw if swagger config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getSwaggerConfig()).toThrow('Swagger config not found');
    });
  });

  // ── getQueueConfig ─────────────────────────────────────────
  describe('getQueueConfig()', () => {
    it('should return the queue config with redis settings', () => {
      const config = service.getQueueConfig();
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
    });

    it('should throw if queue config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getQueueConfig()).toThrow('Queue config not found');
    });
  });

  // ── getLoggerConfig ────────────────────────────────────────
  describe('getLoggerConfig()', () => {
    it('should return the logger config', () => {
      const config = service.getLoggerConfig();
      expect(config.level).toBe(LogLevel.DEBUG);
      expect(config.prettyPrint).toBe(true);
    });

    it('should throw if logger config is missing', () => {
      jest.spyOn(mockConfigService, 'get').mockReturnValue(undefined);
      expect(() => service.getLoggerConfig()).toThrow('Logger config not found');
    });
  });
});
