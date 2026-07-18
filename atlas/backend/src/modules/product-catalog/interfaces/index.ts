// =============================================================
// Product Catalog – Interfaces & Types
// =============================================================

export enum CatalogStatus {
  DRAFT = 'DRAFT',
  READY_FOR_AI = 'READY_FOR_AI',
  AI_GENERATED = 'AI_GENERATED',
  READY_FOR_APPROVAL = 'READY_FOR_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  BUNDLE = 'BUNDLE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum CatalogEvent {
  CREATED = 'product-catalog.created',
  UPDATED = 'product-catalog.updated',
  APPROVED = 'product-catalog.approved',
  ARCHIVED = 'product-catalog.archived',
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

export interface ProductWeight {
  value: number;
  unit: 'kg' | 'lb' | 'g' | 'oz';
}

export interface PackagingDetails {
  unitsPerCarton?: number;
  cartonWeight?: number;
  cartonDimensions?: ProductDimensions;
  packagingType?: string;
  innerBoxQty?: number;
}

export interface ProductVariant {
  variantId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>; // e.g. { color: 'Red', size: 'XL' }
  purchaseCost?: number;
  landedCost?: number;
  suggestedSellingPrice?: number;
  images?: string[];
  stockQty?: number;
}

export interface ProductSpecification {
  key: string;
  value: string;
  unit?: string;
}

export interface ProductAttribute {
  key: string;
  value: string;
}

export interface CatalogAttachment {
  name: string;
  url: string;
  type: 'image' | 'document' | 'video';
  isPrimary?: boolean;
}

export interface ICatalogProduct {
  id: string;
  workspaceId: string;
  catalogSku: string;
  skuSequence: number;
  version: number;
  status: CatalogStatus;

  // Identity
  productName: string;
  brand?: string | null;
  categoryId?: string | null;
  productType: ProductType;
  description?: string | null;
  shortDescription?: string | null;

  // Source
  procurementId?: string | null;
  qualityInspectionId?: string | null;
  supplierId?: string | null;

  // Classification
  countryOfOrigin?: string | null;
  hsCode?: string | null;

  // Specifications & Attributes
  specifications: ProductSpecification[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];

  // Media
  images: string[];
  documents: CatalogAttachment[];

  // Pricing
  purchaseCost?: number | null;
  landedCost?: number | null;
  suggestedSellingPrice?: number | null;
  currency?: string | null;

  // Physical
  dimensions?: ProductDimensions | null;
  weight?: ProductWeight | null;
  packagingDetails?: PackagingDetails | null;

  // Duplicate detection
  duplicateOfId?: string | null;
  isDuplicate: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ICatalogHistory {
  id: string;
  catalogId: string;
  workspaceId: string;
  fromStatus: CatalogStatus;
  toStatus: CatalogStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface CatalogJobPayload {
  catalogId: string;
  catalogSku: string;
  workspaceId: string;
  event: CatalogEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}
