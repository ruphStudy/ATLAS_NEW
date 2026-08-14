import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { CurrencyModule } from '../currency/currency.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { MultiBrandModule } from '../multi-brand/multi-brand.module';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { SuppliersModule } from '../suppliers/suppliers.module';

import { MultiBusinessRepository } from './repository/multi-business.repository';
import { MultiBusinessCache } from './cache/multi-business.cache';
import { MultiBusinessValidator } from './validator/multi-business.validator';
import { MultiBusinessAudit } from './audit/multi-business.audit';
import { MultiBusinessEventQueue } from './events/multi-business-events.queue';
import { MultiBusinessService } from './multi-business.service';
import { MultiBusinessController } from './multi-business.controller';

/**
 * MultiBusinessModule — lets one organization operate several legal/
 * business units, each with its own workspaces, brands, warehouses,
 * marketplace accounts, suppliers and financial settings, plus
 * parent-child hierarchy. Owns business identity, lifecycle (draft/
 * active/suspended/archived, versioned, with ownership-change history)
 * and scope. Every cross-module reference is validated against its
 * owning service (`CountryService`, `CurrencyRegistry`,
 * `WorkspaceService`, `MultiBrandService`, `WarehouseService`,
 * `SuppliersService`) — never recomputed here. Resources not already
 * covered by a reference array are associated via the generic
 * `BusinessEntityLink` table (mirroring `BrandEntityLink`/
 * `DocumentEntityLink`), so no other module's schema is touched.
 * Business-level data visibility/access is enforced through the
 * `visibilityScope` field plus the existing Roles & Permissions guards at
 * the controller layer — no parallel authorization system is introduced.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    CountryModule,
    CurrencyModule,
    WorkspaceModule,
    MultiBrandModule,
    WarehouseModule,
    SuppliersModule,
  ],
  controllers: [MultiBusinessController],
  providers: [
    MultiBusinessRepository,
    MultiBusinessCache,
    MultiBusinessValidator,
    MultiBusinessAudit,
    MultiBusinessEventQueue,
    MultiBusinessService,
  ],
  exports: [MultiBusinessService, MultiBusinessCache],
})
export class MultiBusinessModule {}
