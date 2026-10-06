import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as compression from 'compression';

import { AppModule } from './app.module';
import { ConfigurationService } from '@config/configuration.service';
import { AllExceptionsFilter } from '@common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Typed Configuration ──────────────────────────────────────
  const configService = app.get(ConfigurationService);
  const appConfig = configService.getAppConfig();
  const swaggerConfig = configService.getSwaggerConfig();

  // ── Structured Logger ────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Security Middleware ──────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ── CORS ─────────────────────────────────────────────────────
  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-ID'],
  });

  // ── API Prefix + URI Versioning  →  /api/v1/ ─────────────────
  app.setGlobalPrefix(appConfig.apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: appConfig.apiVersion,
  });

  // ── Global Validation Pipe ───────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ──────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Global Response Interceptor ──────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── Swagger / OpenAPI ────────────────────────────────────────
  if (swaggerConfig.enabled) {
    const swaggerDocument = new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', name: 'X-Workspace-ID', in: 'header' },
        'workspace-id',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerDocument);
    SwaggerModule.setup(swaggerConfig.path, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ── Start Listening ──────────────────────────────────────────
  await app.listen(appConfig.port);

  const logger = app.get(Logger);
  logger.log(
    `[${appConfig.name}] Running on port ${appConfig.port} (${appConfig.env})`,
    'Bootstrap',
  );
  logger.log(
    `API: http://localhost:${appConfig.port}/${appConfig.apiPrefix}/v${appConfig.apiVersion}`,
    'Bootstrap',
  );
  if (swaggerConfig.enabled) {
    logger.log(
      `Swagger: http://localhost:${appConfig.port}/${swaggerConfig.path}`,
      'Bootstrap',
    );
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
