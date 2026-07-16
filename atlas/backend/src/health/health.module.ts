import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * HealthModule
 *
 * Self-contained module with no business module dependencies.
 * DatabaseModule and ConfigurationModule are @Global() so PrismaService
 * and ConfigurationService are automatically available without explicit imports.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
