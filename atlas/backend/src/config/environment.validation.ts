import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { plainToClass, Transform, Type } from 'class-transformer';
import { NodeEnvironment, LogLevel } from './enums';

/**
 * EnvironmentVariables
 *
 * Single class that declares every environment variable the application
 * depends on. class-validator enforces types and constraints at startup.
 *
 * Rules:
 *  - Required variables have no default – missing = startup failure.
 *  - Optional variables carry safe defaults.
 *  - Never add business logic here. Validation only.
 */
export class EnvironmentVariables {
  // ── Application ─────────────────────────────────────────────
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV: NodeEnvironment = NodeEnvironment.DEVELOPMENT;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'ATLAS API';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsOptional()
  API_VERSION: string = '1';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL: number = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  // ── Database ─────────────────────────────────────────────────
  @IsString()
  @Matches(/^postgres(?:ql)?:\/\//, {
    message: 'DATABASE_URL must be a valid PostgreSQL connection string (postgresql://...)',
  })
  DATABASE_URL!: string;

  // ── Redis ────────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // ── JWT ──────────────────────────────────────────────────────
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  // ── Logger ───────────────────────────────────────────────────
  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL: LogLevel = LogLevel.INFO;

  // ── Swagger ──────────────────────────────────────────────────
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  SWAGGER_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  SWAGGER_TITLE: string = 'ATLAS API';

  @IsString()
  @IsOptional()
  SWAGGER_DESCRIPTION: string = 'ATLAS AI Commerce Operating System API';

  @IsString()
  @IsOptional()
  SWAGGER_VERSION: string = '1.0';

  @IsString()
  @IsOptional()
  SWAGGER_PATH: string = 'api/docs';

  // ── AI Provider ──────────────────────────────────────────────
  @IsString()
  @IsOptional()
  AI_PROVIDER_DEFAULT_PROVIDER_KEY?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  AI_PROVIDER_REQUEST_TIMEOUT_MS: number = 30000;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  AI_PROVIDER_MAX_RETRY_ATTEMPTS: number = 2;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  AI_PROVIDER_RETRY_BACKOFF_MS: number = 500;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: number = 60;

  @IsString()
  @IsOptional()
  AI_PROVIDER_USE_CASE_MAP: string = '{}';

  // ── Credential Encryption ───────────────────────────────────
  @IsString()
  @MinLength(32, { message: 'ATLAS_CREDENTIAL_KEY must be at least 32 characters' })
  ATLAS_CREDENTIAL_KEY!: string;
}

/**
 * validate()
 *
 * Called by ConfigModule.forRoot({ validate }) during application startup.
 * Throws a descriptive error if any constraint fails — the application
 * will NOT start, which is the correct behavior for misconfiguration.
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // enableImplicitConversion: false so @Transform decorators have full control.
  // All numeric coercions are handled explicitly via @Type(() => Number).
  const validated = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: false,
    excludeExtraneousValues: false,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((err) =>
        Object.entries(err.constraints ?? {}).map(
          ([rule, msg]) => `  [${err.property}] ${rule}: ${msg}`,
        ),
      )
      .join('\n');

    throw new Error(
      `\n\n╔═══════════════════════════════════════════╗\n` +
        `║   ATLAS – Configuration Validation Failed   ║\n` +
        `╚═══════════════════════════════════════════╝\n\n` +
        `The following environment variables are invalid or missing:\n\n` +
        `${messages}\n\n` +
        `Check your .env or environment and restart.\n`,
    );
  }

  return validated;
}
