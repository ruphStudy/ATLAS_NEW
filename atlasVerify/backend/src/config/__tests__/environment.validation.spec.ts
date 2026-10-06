// reflect-metadata must be imported before class-validator decorators
import 'reflect-metadata';

import { validate, EnvironmentVariables } from '../environment.validation';
import { NodeEnvironment, LogLevel } from '../enums';

// ── Valid base config used across tests ──────────────────────
const VALID_CONFIG: Record<string, unknown> = {
  NODE_ENV: 'development',
  APP_NAME: 'ATLAS API',
  PORT: '3001',
  API_PREFIX: 'api',
  API_VERSION: '1',
  CORS_ORIGINS: 'http://localhost:3000',
  THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '100',
  DATABASE_URL: 'postgresql://atlas_user:atlas_password@localhost:5432/atlas_db',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_SECRET: 'atlas-test-jwt-secret-minimum-32-characters-long',
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_SECRET: 'atlas-test-refresh-secret-minimum-32-chars',
  JWT_REFRESH_EXPIRES_IN: '30d',
  LOG_LEVEL: 'info',
  SWAGGER_ENABLED: 'true',
  SWAGGER_TITLE: 'ATLAS API',
  SWAGGER_VERSION: '1.0',
  SWAGGER_PATH: 'api/docs',
};

// ── Helper ───────────────────────────────────────────────────
function without(key: string): Record<string, unknown> {
  const { [key]: _omitted, ...rest } = VALID_CONFIG;
  return rest;
}

function withOverride(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...VALID_CONFIG, ...overrides };
}

// ── Test Suite ────────────────────────────────────────────────
describe('EnvironmentValidation', () => {
  describe('validate() – valid configuration', () => {
    it('should pass with a fully valid config', () => {
      expect(() => validate(VALID_CONFIG)).not.toThrow();
    });

    it('should return an EnvironmentVariables instance', () => {
      const result = validate(VALID_CONFIG);
      expect(result).toBeInstanceOf(EnvironmentVariables);
    });

    it('should coerce PORT string to number', () => {
      const result = validate(VALID_CONFIG);
      expect(typeof result.PORT).toBe('number');
      expect(result.PORT).toBe(3001);
    });

    it('should coerce SWAGGER_ENABLED string "true" to boolean true', () => {
      const result = validate(withOverride({ SWAGGER_ENABLED: 'true' }));
      expect(result.SWAGGER_ENABLED).toBe(true);
    });

    it('should coerce SWAGGER_ENABLED string "false" to boolean false', () => {
      const result = validate(withOverride({ SWAGGER_ENABLED: 'false' }));
      expect(result.SWAGGER_ENABLED).toBe(false);
    });

    it('should use default PORT (3001) when not provided', () => {
      const result = validate(without('PORT'));
      expect(result.PORT).toBe(3001);
    });

    it('should use default LOG_LEVEL (info) when not provided', () => {
      const result = validate(without('LOG_LEVEL'));
      expect(result.LOG_LEVEL).toBe(LogLevel.INFO);
    });

    it('should use default REDIS_HOST (localhost) when not provided', () => {
      const result = validate(without('REDIS_HOST'));
      expect(result.REDIS_HOST).toBe('localhost');
    });

    it('should use default JWT_EXPIRES_IN (7d) when not provided', () => {
      const result = validate(without('JWT_EXPIRES_IN'));
      expect(result.JWT_EXPIRES_IN).toBe('7d');
    });
  });

  describe('validate() – required field failures', () => {
    it('should throw when DATABASE_URL is missing', () => {
      expect(() => validate(without('DATABASE_URL'))).toThrow();
    });

    it('should throw when JWT_SECRET is missing', () => {
      expect(() => validate(without('JWT_SECRET'))).toThrow();
    });

    it('should throw when JWT_REFRESH_SECRET is missing', () => {
      expect(() => validate(without('JWT_REFRESH_SECRET'))).toThrow();
    });

    it('should include a descriptive error message', () => {
      try {
        validate(without('DATABASE_URL'));
        fail('Expected validate() to throw');
      } catch (err: unknown) {
        expect((err as Error).message).toContain('Configuration Validation Failed');
        expect((err as Error).message).toContain('DATABASE_URL');
      }
    });
  });

  describe('validate() – constraint failures', () => {
    it('should throw when JWT_SECRET is shorter than 32 characters', () => {
      expect(() => validate(withOverride({ JWT_SECRET: 'tooshort' }))).toThrow();
    });

    it('should throw when JWT_REFRESH_SECRET is shorter than 32 characters', () => {
      expect(() => validate(withOverride({ JWT_REFRESH_SECRET: 'short' }))).toThrow();
    });

    it('should throw when NODE_ENV has an invalid value', () => {
      expect(() => validate(withOverride({ NODE_ENV: 'invalid_environment' }))).toThrow();
    });

    it('should throw when LOG_LEVEL has an invalid value', () => {
      expect(() => validate(withOverride({ LOG_LEVEL: 'verbose' }))).toThrow();
    });

    it('should throw when PORT is outside valid range (> 65535)', () => {
      expect(() => validate(withOverride({ PORT: '99999' }))).toThrow();
    });

    it('should throw when PORT is 0', () => {
      expect(() => validate(withOverride({ PORT: '0' }))).toThrow();
    });

    it('should throw when DATABASE_URL is not a valid PostgreSQL URL', () => {
      expect(() => validate(withOverride({ DATABASE_URL: 'not-a-valid-url' }))).toThrow();
    });
  });

  describe('validate() – enum coverage', () => {
    it('should accept all valid NodeEnvironment values', () => {
      Object.values(NodeEnvironment).forEach((env) => {
        expect(() => validate(withOverride({ NODE_ENV: env }))).not.toThrow();
      });
    });

    it('should accept all valid LogLevel values', () => {
      Object.values(LogLevel).forEach((level) => {
        expect(() => validate(withOverride({ LOG_LEVEL: level }))).not.toThrow();
      });
    });
  });
});
