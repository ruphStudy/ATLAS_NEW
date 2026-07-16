import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration – single source of truth
import { ConfigurationModule, ConfigurationService } from '@config/index';

// Common Infrastructure
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';

// Core Modules
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from './health/health.module';

// Auth – must be imported before the global guard is used
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { JwtAuthGuard } from '@modules/authentication/guards';

// Feature Modules
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { UsersModule } from '@modules/users/users.module';
import { ProductsModule } from '@modules/products/products.module';
import { SuppliersModule } from '@modules/suppliers/suppliers.module';
import { PricingModule } from '@modules/pricing/pricing.module';
import { ListingModule } from '@modules/listing/listing.module';
import { InventoryModule } from '@modules/inventory/inventory.module';
import { MarketplaceModule } from '@modules/marketplace/marketplace.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SettingsModule } from '@modules/settings/settings.module';
import { OpportunityModule } from '@modules/opportunities/opportunity.module';
import { DiscoveryModule } from '@modules/discovery/discovery.module';
import { SupplierDiscoveryModule } from '@modules/supplier-discovery/supplier-discovery.module';
import { SupplierVerificationModule } from '@modules/supplier-verification/supplier-verification.module';
import { ProductAnalysisModule } from '@modules/product-analysis/product-analysis.module';

// Infrastructure Modules
import { QueuesModule } from './queues/queues.module';
import { WorkersModule } from './workers/workers.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigurationModule,

    LoggerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const logger = config.getLoggerConfig();
        return {
          pinoHttp: {
            level: logger.level,
            transport: logger.prettyPrint
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
            customLogLevel: (_req: unknown, res: { statusCode: number }) => {
              if (res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const { throttle } = config.getAppConfig();
        return [{ ttl: throttle.ttl * 1_000, limit: throttle.limit }];
      },
    }),

    DatabaseModule,
    HealthModule,

    // Auth (loaded before feature modules so JwtAuthGuard is available globally)
    AuthenticationModule,

    WorkspaceModule,
    UsersModule,
    ProductsModule,
    SuppliersModule,
    PricingModule,
    ListingModule,
    InventoryModule,
    MarketplaceModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule,
    OpportunityModule,
    DiscoveryModule,
    SupplierDiscoveryModule,
    SupplierVerificationModule,
    ProductAnalysisModule,

    QueuesModule,
    WorkersModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ── Global JWT guard ──────────────────────────────────────
    // All routes require a valid Bearer token unless decorated with @Public().
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // RequestIdMiddleware must run first so requestId is available
    // to all filters and interceptors
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

