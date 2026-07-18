import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DatabaseModule } from '@database/database.module';
import { SupplierProviderModule } from '@modules/supplier-provider/supplier-provider.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';
import { SupplierEventsService } from './events';

@Module({
  imports: [DatabaseModule, EventEmitterModule, SupplierProviderModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository, SupplierEventsService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
