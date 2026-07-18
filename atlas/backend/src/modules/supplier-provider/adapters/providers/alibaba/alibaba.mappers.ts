import {
  AtlasProduct,
  AtlasQuotation,
  AtlasSupplier,
  AtlasValidationCheck,
  AtlasValidationResult,
  SupplierProviderCode,
} from '../../../interfaces';
import {
  normalizeCurrency,
  normalizeUnit,
  normalizeCountry,
} from '../../adapter.mappers';
import {
  AlibabaRawAttribute,
  AlibabaRawCatalog,
  AlibabaRawCategory,
  AlibabaRawImage,
  AlibabaRawOrderResponse,
  AlibabaRawPriceTier,
  AlibabaRawProduct,
  AlibabaRawRfqResponse,
  AlibabaRawShipmentTracking,
  AlibabaRawSupplier,
  AlibabaRawVariant,
} from './alibaba.types';
import { ALIBABA_SHIPMENT_STATUS_MAP } from './alibaba.constants';

const PROVIDER_CODE = SupplierProviderCode.ALIBABA;

// ── Supplier Mapping ──────────────────────────────────────────

export function mapAlibabaSupplier(raw: AlibabaRawSupplier): AtlasSupplier {
  const supplierId = (raw.member_id ?? raw.login_id ?? '').trim();
  const isVerified = isAlibabaVerified(raw);
  const country = normalizeCountry(raw.country ?? '') ?? (raw.country ?? '');
  const categories = parseCategories(raw.product_categories, raw.main_products);
  const overallRating: number | null = null; // Alibaba does not expose a numeric rating in basic API

  return {
    providerCode: PROVIDER_CODE,
    providerSupplierId: supplierId,
    name: raw.company_name ?? '',
    country,
    city: raw.city ?? null,
    website: raw.website ?? null,
    contactEmail: raw.email ?? null,
    contactPhone: raw.phone ?? raw.mobile ?? null,
    categories,
    minOrderQuantity: null,
    avgLeadTimeDays: null,
    overallRating,
    isVerified,
    tier: resolveSupplierTier(raw),
    rawData: raw as Record<string, unknown>,
  };
}

export function mapAlibabaSupplierValidation(raw: AlibabaRawSupplier): AtlasValidationResult {
  const hasId = !!(raw.member_id ?? raw.login_id)?.trim();
  const hasName = !!raw.company_name?.trim();
  const isGold = !!raw.is_gold_supplier;
  const isVerified = !!raw.is_verified_supplier;
  const hasTradeAssurance = !!raw.is_trade_assurance;
  const hasContact = !!(raw.email || raw.phone || raw.mobile);
  const hasCats = parseCategories(raw.product_categories, raw.main_products).length > 0;
  const yearsOnPlatform = raw.years_on_alibaba ?? 0;

  const checks: AtlasValidationCheck[] = [
    { checkName: 'has_member_id', passed: hasId, score: hasId ? 15 : 0, notes: null },
    { checkName: 'has_company_name', passed: hasName, score: hasName ? 15 : 0, notes: null },
    { checkName: 'is_verified_supplier', passed: isVerified, score: isVerified ? 20 : 0, notes: null },
    { checkName: 'is_gold_supplier', passed: isGold, score: isGold ? 15 : 0, notes: null },
    { checkName: 'has_trade_assurance', passed: hasTradeAssurance, score: hasTradeAssurance ? 15 : 0, notes: null },
    { checkName: 'has_contact_info', passed: hasContact, score: hasContact ? 10 : 0, notes: null },
    { checkName: 'has_categories', passed: hasCats, score: hasCats ? 5 : 0, notes: null },
    {
      checkName: 'platform_tenure',
      passed: yearsOnPlatform >= 1,
      score: Math.min(yearsOnPlatform * 1, 5),
      notes: yearsOnPlatform > 0 ? `${yearsOnPlatform} years on Alibaba` : 'Platform tenure unknown',
    },
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);
  const allRequired = hasId && hasName;

  return {
    isValid: allRequired && score >= 40,
    score: Math.min(score, 100),
    checks,
    summary: `Alibaba supplier validation score: ${score}/100`,
  };
}

// ── Product Mapping ───────────────────────────────────────────

export function mapAlibabaProduct(raw: AlibabaRawProduct): AtlasProduct {
  const productId = (raw.product_id ?? '').trim();
  const name = raw.subject ?? '';
  const description = raw.description ?? null;
  const category = raw.category_name ?? null;
  const subCategory = raw.sub_category ?? null;
  const brand = raw.brand_name ?? null;

  const unitPrice = parseLowestTierPrice(raw);
  const currency = normalizeCurrency(raw.currency ?? raw.price_info?.currency ?? 'USD');
  const unit = normalizeUnit(raw.unit ?? raw.price_unit ?? raw.price_info?.unit ?? null);
  const moq = parseMoq(raw);
  const images = parseImages(raw.images);
  const attributes = parseAttributes(raw.attributes, raw.specifications);

  return {
    providerCode: PROVIDER_CODE,
    providerProductId: productId,
    name,
    description,
    category,
    subCategory,
    brand,
    unitPrice: unitPrice && isFinite(unitPrice) ? unitPrice : null,
    currency,
    minOrderQuantity: moq && isFinite(moq) ? moq : null,
    images,
    attributes,
    supplierProviderSupplierId: raw.supplier_member_id ?? null,
    rawData: raw as Record<string, unknown>,
  };
}

export function mapAlibabaProductValidation(raw: AlibabaRawProduct): AtlasValidationResult {
  const hasId = !!raw.product_id?.trim();
  const hasName = !!raw.subject?.trim();
  const hasPrice = !!(raw.price_info?.price || raw.price_range || (raw.price_tiers?.length ?? 0) > 0);
  const hasCategory = !!raw.category_name;
  const hasImages = parseImages(raw.images).length > 0;
  const hasMoq = parseMoq(raw) !== null;
  const hasSupplier = !!raw.supplier_member_id;

  const checks: AtlasValidationCheck[] = [
    { checkName: 'has_product_id', passed: hasId, score: hasId ? 20 : 0, notes: null },
    { checkName: 'has_name', passed: hasName, score: hasName ? 20 : 0, notes: null },
    { checkName: 'has_price', passed: hasPrice, score: hasPrice ? 20 : 0, notes: null },
    { checkName: 'has_category', passed: hasCategory, score: hasCategory ? 15 : 0, notes: null },
    { checkName: 'has_images', passed: hasImages, score: hasImages ? 15 : 0, notes: null },
    { checkName: 'has_moq', passed: hasMoq, score: hasMoq ? 5 : 0, notes: null },
    { checkName: 'has_supplier_ref', passed: hasSupplier, score: hasSupplier ? 5 : 0, notes: null },
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);

  return {
    isValid: hasId && hasName && hasPrice,
    score,
    checks,
    summary: `Alibaba product validation score: ${score}/100`,
  };
}

// ── Tiered Price Mapping ──────────────────────────────────────

export interface NormalizedPriceTier {
  quantityFrom: number;
  quantityTo: number | null;
  unitPrice: number;
  currency: string;
}

export function mapAlibabaPriceTiers(
  tiers: AlibabaRawPriceTier[] | null | undefined,
  fallbackCurrency: string | null | undefined,
): NormalizedPriceTier[] {
  if (!tiers?.length) return [];
  return tiers
    .filter((t) => t.price !== undefined && t.price !== null)
    .map((t) => ({
      quantityFrom: t.quantity_from ?? 0,
      quantityTo: t.quantity_to ?? null,
      unitPrice: parseFloat(t.price ?? '0'),
      currency: normalizeCurrency(t.currency ?? fallbackCurrency ?? 'USD') ?? 'USD',
    }));
}

// ── Quotation Mapping ─────────────────────────────────────────

export function mapAlibabaRfqToQuotation(
  raw: AlibabaRawRfqResponse,
  supplierId: string,
): AtlasQuotation {
  const unitPrice = parseFloat(raw.unit_price ?? '0') || 0;
  const quantity = raw.quantity ?? 1;
  const currency = normalizeCurrency(raw.currency ?? 'USD') ?? 'USD';
  const leadTimeDays = parseInt(raw.lead_time ?? '', 10) || null;

  let validUntil: Date | null = null;
  if (raw.valid_until) {
    const d = new Date(raw.valid_until);
    validUntil = isNaN(d.getTime()) ? null : d;
  }

  return {
    providerCode: PROVIDER_CODE,
    providerQuotationId: raw.rfq_id ?? raw.inquiry_id ?? '',
    supplierId,
    productId: raw.product_id ?? null,
    quantity,
    unitPrice,
    totalPrice: parseFloat(raw.total_price ?? '') || unitPrice * quantity,
    currency,
    leadTimeDays: leadTimeDays && isFinite(leadTimeDays) ? leadTimeDays : null,
    validUntil,
    terms: [raw.payment_terms, raw.shipping_terms, raw.incoterms].filter(Boolean).join('; ') || null,
    rawData: raw as Record<string, unknown>,
  };
}

// ── Order Reference Mapping ───────────────────────────────────

export interface NormalizedOrderRef {
  providerOrderId: string;
  tradeOrderId: string | null;
  status: string | null;
  currency: string | null;
  totalAmount: number | null;
  tradeAssurance: boolean;
  createdAt: Date | null;
  rawData: Record<string, unknown>;
}

export function mapAlibabaOrderResponse(raw: AlibabaRawOrderResponse): NormalizedOrderRef {
  return {
    providerOrderId: raw.order_id ?? raw.trade_order_id ?? '',
    tradeOrderId: raw.trade_order_id ?? null,
    status: raw.status ?? null,
    currency: normalizeCurrency(raw.currency ?? null),
    totalAmount: parseFloat(raw.total_amount ?? '') || null,
    tradeAssurance: !!raw.trade_assurance,
    createdAt: raw.created_at ? (isNaN(new Date(raw.created_at).getTime()) ? null : new Date(raw.created_at)) : null,
    rawData: raw as Record<string, unknown>,
  };
}

// ── Shipment Tracking Mapping ─────────────────────────────────

export interface NormalizedShipmentTrack {
  logisticsNo: string | null;
  carrier: string | null;
  status: string | null;
  normalizedStatus: string | null;
  currentLocation: string | null;
  estimatedDelivery: Date | null;
  events: Array<{ timestamp: Date | null; location: string | null; description: string | null; status: string | null }>;
  rawData: Record<string, unknown>;
}

export function mapAlibabaShipmentTracking(raw: AlibabaRawShipmentTracking): NormalizedShipmentTrack {
  const rawStatus = raw.status ?? null;
  const normalizedStatus = rawStatus ? (ALIBABA_SHIPMENT_STATUS_MAP[rawStatus.toUpperCase()] ?? rawStatus) : null;

  const events = (raw.events ?? []).map((e) => ({
    timestamp: e.timestamp ? (isNaN(new Date(e.timestamp).getTime()) ? null : new Date(e.timestamp)) : null,
    location: e.location ?? null,
    description: e.description ?? null,
    status: e.status ?? null,
  }));

  return {
    logisticsNo: raw.logistics_no ?? null,
    carrier: raw.carrier ?? null,
    status: rawStatus,
    normalizedStatus,
    currentLocation: raw.current_location ?? null,
    estimatedDelivery: raw.estimated_delivery
      ? (isNaN(new Date(raw.estimated_delivery).getTime()) ? null : new Date(raw.estimated_delivery))
      : null,
    events,
    rawData: raw as Record<string, unknown>,
  };
}

// ── Catalog Mapping ───────────────────────────────────────────

export function mapAlibabaCatalog(raw: AlibabaRawCatalog): AtlasProduct[] {
  return (raw.products ?? []).map(mapAlibabaProduct);
}

// ── Helpers ───────────────────────────────────────────────────

function isAlibabaVerified(raw: AlibabaRawSupplier): boolean {
  return !!(raw.is_verified_supplier || raw.is_gold_supplier || raw.is_assessed);
}

function resolveSupplierTier(raw: AlibabaRawSupplier): string | null {
  if (raw.is_verified_supplier) return 'VERIFIED_SUPPLIER';
  if (raw.is_gold_supplier) return 'GOLD_SUPPLIER';
  if (raw.is_assessed) return 'ASSESSED';
  if (raw.is_trade_assurance) return 'TRADE_ASSURANCE';
  return null;
}

function parseCategories(
  categoriesArr: AlibabaRawCategory[] | null | undefined,
  mainProducts: string | null | undefined,
): string[] {
  if (categoriesArr?.length) {
    return categoriesArr
      .map((c) => c.category_name ?? '')
      .filter(Boolean);
  }
  if (mainProducts?.trim()) {
    return mainProducts.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseImages(images: AlibabaRawImage[] | null | undefined): string[] {
  if (!images?.length) return [];
  return images
    .map((img) => img.image_url ?? img.url ?? '')
    .filter(Boolean);
}

function parseAttributes(
  attrs: AlibabaRawAttribute[] | null | undefined,
  specs: Record<string, string> | null | undefined,
): Record<string, string> {
  const result: Record<string, string> = { ...(specs ?? {}) };
  for (const a of attrs ?? []) {
    if (a.attribute_name && a.attribute_value) {
      result[a.attribute_name] = a.attribute_value;
    }
  }
  return result;
}

function parseLowestTierPrice(raw: AlibabaRawProduct): number | null {
  if (raw.price_info?.price) {
    const p = parseFloat(raw.price_info.price);
    return isFinite(p) ? p : null;
  }
  if (raw.price_tiers?.length) {
    const sorted = [...raw.price_tiers].sort((a, b) => (a.quantity_from ?? 0) - (b.quantity_from ?? 0));
    const first = parseFloat(sorted[0]?.price ?? '');
    return isFinite(first) ? first : null;
  }
  if (raw.price_range) {
    const parts = raw.price_range.split('-');
    const first = parseFloat(parts[0]?.trim() ?? '');
    return isFinite(first) ? first : null;
  }
  return null;
}

function parseMoq(raw: AlibabaRawProduct): number | null {
  if (raw.min_order_quantity !== undefined && raw.min_order_quantity !== null) {
    return isFinite(raw.min_order_quantity) ? raw.min_order_quantity : null;
  }
  if (raw.moq) {
    const parsed = parseFloat(raw.moq);
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}
