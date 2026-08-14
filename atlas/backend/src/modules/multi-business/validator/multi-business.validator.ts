import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { CurrencyRegistry } from '@modules/currency/registry/currency.registry';
import { WorkspaceService } from '@modules/workspace/workspace.service';
import { MultiBrandService } from '@modules/multi-brand/multi-brand.service';
import { WarehouseService } from '@modules/warehouse/warehouse.service';
import { SuppliersService } from '@modules/suppliers/suppliers.service';
import { MultiBusinessRepository } from '../repository/multi-business.repository';
import { BusinessValidationIssueType, IBusinessValidationResult } from '../interfaces';
import { MULTI_BUSINESS_CONSTANTS } from '../constants';

export interface BusinessCandidate {
  workspaceId: string;
  countryCode?: string | null;
  currencyCode?: string | null;
  workspaceIds: string[];
  brandIds: string[];
  warehouseIds: string[];
  supplierIds: string[];
  actorUserId?: string;
}

/**
 * MultiBusinessValidator
 *
 * Validates a business's cross-module references before create/update:
 * every country/currency/workspace/brand/warehouse/supplier reference must
 * already exist in its owning module — resolved by calling that module's
 * own service, never re-implemented here. Duplicate-code and duplicate
 * legal-identity checks, and cross-business entity-link conflicts, are
 * checked directly by `MultiBusinessService` (purely local to this
 * module's own tables), not here.
 */
@Injectable()
export class MultiBusinessValidator {
  constructor(
    private readonly repository: MultiBusinessRepository,
    private readonly countryService: CountryService,
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly workspaceService: WorkspaceService,
    private readonly multiBrandService: MultiBrandService,
    private readonly warehouseService: WarehouseService,
    private readonly suppliersService: SuppliersService,
  ) {}

  async validateBusiness(candidate: BusinessCandidate): Promise<IBusinessValidationResult> {
    const issues: IBusinessValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (candidate.countryCode) {
      try {
        await this.countryService.findByCode(candidate.countryCode);
      } catch {
        issues.push({ type: BusinessValidationIssueType.UNKNOWN_COUNTRY, message: `Country '${candidate.countryCode}' is not registered` });
      }
    }

    if (candidate.currencyCode && !this.currencyRegistry.get(candidate.currencyCode)) {
      issues.push({ type: BusinessValidationIssueType.UNKNOWN_CURRENCY, message: `Currency '${candidate.currencyCode}' is not registered` });
    }

    if (candidate.actorUserId) {
      for (const workspaceId of candidate.workspaceIds) {
        try {
          await this.workspaceService.findById(workspaceId, candidate.actorUserId);
        } catch {
          issues.push({ type: BusinessValidationIssueType.UNKNOWN_WORKSPACE, message: `Workspace '${workspaceId}' was not found or is not accessible` });
        }
      }
    } else if (candidate.workspaceIds.length > 0) {
      warnings.push('Associated workspace references were not validated because no acting user was provided');
    }

    for (const brandId of candidate.brandIds) {
      try {
        await this.multiBrandService.findBrandById(brandId, candidate.workspaceId);
      } catch {
        issues.push({ type: BusinessValidationIssueType.UNKNOWN_BRAND, message: `Brand '${brandId}' was not found in this workspace` });
      }
    }

    for (const warehouseId of candidate.warehouseIds) {
      try {
        await this.warehouseService.findById(warehouseId, candidate.workspaceId);
      } catch {
        issues.push({ type: BusinessValidationIssueType.UNKNOWN_WAREHOUSE, message: `Warehouse '${warehouseId}' was not found in this workspace` });
      }
    }

    for (const supplierId of candidate.supplierIds) {
      try {
        await this.suppliersService.findById(supplierId, candidate.workspaceId);
      } catch {
        issues.push({ type: BusinessValidationIssueType.UNKNOWN_SUPPLIER, message: `Supplier '${supplierId}' was not found in this workspace` });
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /** Walks the existing parent chain from `parentBusinessId` — throws no exception itself, just reports whether assigning it to `businessId` would close a cycle. */
  async wouldCreateHierarchyCycle(businessId: string, parentBusinessId: string): Promise<boolean> {
    if (parentBusinessId === businessId) return true;

    let currentId: string | null = parentBusinessId;
    for (let hop = 0; currentId && hop < MULTI_BUSINESS_CONSTANTS.HIERARCHY_MAX_DEPTH; hop += 1) {
      const current = await this.repository.findBusinessById(currentId);
      if (!current) return false;
      const nextParentId = current['parentBusinessId'] as string | null;
      if (nextParentId === businessId) return true;
      currentId = nextParentId;
    }
    return false;
  }
}
