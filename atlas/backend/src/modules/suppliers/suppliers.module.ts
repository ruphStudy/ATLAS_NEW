import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';

/**
 * SuppliersModule
 *
 * Responsibilities:
 *   - Supplier / vendor directory
 *   - Supplier contact management
 *   - Supplier-product associations
 *   - Lead time and MOQ tracking
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService],
})
export class SuppliersModule {}
