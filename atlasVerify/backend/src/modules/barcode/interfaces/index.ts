// =============================================================
// Barcode & Label – Interfaces & Types
// =============================================================

export enum BarcodeType {
  UPC = 'UPC',
  EAN = 'EAN',
  GTIN = 'GTIN',
  CODE_128 = 'CODE_128',
  CODE_39 = 'CODE_39',
  QR = 'QR',
  CUSTOM = 'CUSTOM',
}

export enum BarcodeEntityType {
  SKU = 'SKU',
  PRODUCT = 'PRODUCT',
  VARIANT = 'VARIANT',
  BATCH = 'BATCH',
  SERIAL = 'SERIAL',
  WAREHOUSE = 'WAREHOUSE',
  ZONE = 'ZONE',
  LOCATION = 'LOCATION',
  BIN = 'BIN',
  PACKAGE = 'PACKAGE',
  SHIPMENT = 'SHIPMENT',
}

export enum BarcodeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REPLACED = 'REPLACED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum BarcodeEvent {
  GENERATED = 'barcode.generated',
  ASSIGNED = 'barcode.assigned',
  SCANNED = 'barcode.scanned',
  REPLACED = 'barcode.replaced',
  DEACTIVATED = 'barcode.deactivated',
  LABEL_PRINTED = 'barcode.label_printed',
}

export enum LabelSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  CUSTOM = 'CUSTOM',
}

export enum ScanResult {
  SUCCESS = 'SUCCESS',
  NOT_FOUND = 'NOT_FOUND',
  INACTIVE = 'INACTIVE',
  INVALID = 'INVALID',
}

export interface IBarcode {
  id: string;
  workspaceId: string;
  value: string;
  type: BarcodeType;
  entityType: BarcodeEntityType;
  entityId: string;
  status: BarcodeStatus;
  version: number;
  replacedById?: string | null;
  gs1Prefix?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBarcodeScanHistory {
  id: string;
  workspaceId: string;
  barcodeId: string;
  scannedValue: string;
  result: ScanResult;
  entityType?: BarcodeEntityType | null;
  entityId?: string | null;
  scannedBy?: string | null;
  deviceId?: string | null;
  locationContext?: string | null;
  metadata?: Record<string, unknown>;
  scannedAt: Date;
}

export interface ILabelPrintHistory {
  id: string;
  workspaceId: string;
  barcodeId: string;
  templateId?: string | null;
  labelSize: LabelSize;
  quantity: number;
  printedBy?: string | null;
  printerName?: string | null;
  metadata?: Record<string, unknown>;
  printedAt: Date;
}

export interface ILabelTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  entityType: BarcodeEntityType;
  size: LabelSize;
  width?: number | null;
  height?: number | null;
  fields: string[];
  logoUrl?: string | null;
  printerSettings: Record<string, unknown>;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
