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
  TradeIndiaRawCatalog,
  TradeIndiaRawCategory,
  TradeIndiaRawImage,
  TradeIndiaRawProduct,
  TradeIndiaRawRfqResponse,
  TradeIndiaRawSupplier,
} from './tradeindia.types';

const PROVIDER_CODE = SupplierProviderCode.TRADEINDIA;

// ── Supplier Mapping ──────────────────────────────────────────

export function mapTradeIndiaSupplier(raw: TradeIndiaRawSupplier): AtlasSupplier {
  const supplierId = coalesce(raw.SELLER_ID, raw.seller_id);
  const name = coalesce(raw.COMPANY_NAME, raw.company_name, raw.name) ?? '';
  const city = coalesce(raw.CITY, raw.city);
  const country = normalizeCountry(coalesce(raw.COUNTRY, raw.country) ?? 'IN') ?? 'IN';
  const email = coalesce(raw.EMAIL, raw.email);
  const phone = coalesce(raw.PHONE, raw.phone, raw.MOBILE, raw.mobile);
  const website = coalesce(raw.WEBSITE, raw.website);
  const isVerified = isTradeIndiaVerified(raw);
  const overallRating = parseRating(coalesce(raw.RATING, raw.rating));
  const categories = parseCategories(
    coalesce(raw.CATEGORIES, raw.categories),
    coalesce(raw.MAIN_PRODUCTS, raw.main_products),
  );

  return {
    providerCode: PROVIDER_CODE,
    providerSupplierId: supplierId ?? '',
    name,
    country,
    city: city ?? null,
    website: website ?? null,
    contactEmail: email ?? null,
    contactPhone: phone ?? null,
    categories,
    minOrderQuantity: null,
    avgLeadTimeDays: null,
    overallRating,
    isVerified,
    tier: resolveSupplierTier(raw),
    rawData: raw as Record<string, unknown>,
  };
}

export function mapTradeIndiaSupplierValidation(raw: TradeIndiaRawSupplier): AtlasValidationResult {
  const hasId = !!coalesce(raw.SELLER_ID, raw.seller_id)?.trim();
  const hasName = !!coalesce(raw.COMPANY_NAME, raw.company_name, raw.name)?.trim();
  const isVerified = isTradeIndiaVerified(raw);
  const isPremium = isBoolish(coalesce(raw.IS_PREMIUM, raw.is_premium));
  const hasContact = !!(coalesce(raw.EMAIL, raw.email) || coalesce(raw.PHONE, raw.phone));
  const hasCats = parseCategories(
    coalesce(raw.CATEGORIES, raw.categories),
    coalesce(raw.MAIN_PRODUCTS, raw.main_products),
  ).length > 0;

  const checks: AtlasValidationCheck[] = [
    { checkName: 'has_seller_id', passed: hasId, score: hasId ? 20 : 0, notes: null },
    { checkName: 'has_company_name', passed: hasName, score: hasName ? 20 : 0, notes: null },
    { checkName: 'is_verified', passed: isVerified, score: isVerified ? 25 : 0, notes: null },
    { checkName: 'is_premium_member', passed: isPremium, score: isPremium ? 15 : 0, notes: null },
    { checkName: 'has_contact_info', passed: hasContact, score: hasContact ? 10 : 0, notes: null },
    { checkName: 'has_categories', passed: hasCats, score: hasCats ? 10 : 0, notes: null },
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);
  return {
    isValid: hasId && hasName && score >= 40,
    score: Math.min(score, 100),
    checks,
    summary: `TradeIndia supplier validation score: ${score}/100`,
  };
}

// ── Product Mapping ───────────────────────────────────────────

export function mapTradeIndiaProduct(raw: TradeIndiaRawProduct): AtlasProduct {
  const productId = coalesce(raw.PRODUCT_ID, raw.product_id) ?? '';
  const name = coalesce(raw.PRODUCT_NAME, raw.product_name) ?? '';
  const description = coalesce(raw.DESCRIPTION, raw.description) ?? null;
  const category = coalesce(raw.CATEGORY, raw.category) ?? null;
  const subCategory = coalesce(raw.SUB_CATEGORY, raw.sub_category) ?? null;
  const brand = coalesce(raw.BRAND, raw.brand) ?? null;

  const rawPrice = coalesce(raw.PRICE, raw.price, raw.MIN_PRICE, raw.min_price);
  const unitPrice = rawPrice !== null && rawPrice !== undefined ? parseFloat(String(rawPrice)) : null;
  const currency = normalizeCurrency(coalesce(raw.CURRENCY, raw.currency) ?? 'INR');
  const unit = normalizeUnit(coalesce(raw.UNIT, raw.unit) ?? null);
  const rawMoq = coalesce(raw.MOQ, raw.moq);
  const moq = rawMoq !== null && rawMoq !== undefined ? parseFloat(String(rawMoq)) : null;
  const images = parseImages(coalesce(raw.IMAGES, raw.images), coalesce(raw.IMAGE_URL, raw.image_url));
  const attributes: Record<string, string> = {
    ...(coalesce(raw.SPECIFICATIONS, raw.specifications) ?? {}),
    ...(coalesce(raw.ATTRIBUTES, raw.attributes) ?? {}),
  };

  return {
    providerCode: PROVIDER_CODE,
    providerProductId: productId,
    name,
    description,
    category,
    subCategory,
    brand,
    unitPrice: unitPrice !== null && isFinite(unitPrice) ? unitPrice : null,
    currency,
    minOrderQuantity: moq !== null && isFinite(moq) ? moq : null,
    images,
    attributes,
    supplierProviderSupplierId: coalesce(raw.SELLER_ID, raw.seller_id) ?? null,
    rawData: raw as Record<string, unknown>,
  };
}

export function mapTradeIndiaProductValidation(raw: TradeIndiaRawProduct): AtlasValidationResult {
  const hasId = !!coalesce(raw.PRODUCT_ID, raw.product_id)?.trim();
  const hasName = !!coalesce(raw.PRODUCT_NAME, raw.product_name)?.trim();
  const hasPrice = !!(coalesce(raw.PRICE, raw.price, raw.MIN_PRICE, raw.min_price));
  const hasCategory = !!coalesce(raw.CATEGORY, raw.category);
  const hasImages = parseImages(coalesce(raw.IMAGES, raw.images), coalesce(raw.IMAGE_URL, raw.image_url)).length > 0;

  const checks: AtlasValidationCheck[] = [
    { checkName: 'has_product_id', passed: hasId, score: hasId ? 20 : 0, notes: null },
    { checkName: 'has_name', passed: hasName, score: hasName ? 25 : 0, notes: null },
    { checkName: 'has_price', passed: hasPrice, score: hasPrice ? 25 : 0, notes: null },
    { checkName: 'has_category', passed: hasCategory, score: hasCategory ? 15 : 0, notes: null },
    { checkName: 'has_images', passed: hasImages, score: hasImages ? 15 : 0, notes: null },
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);
  return {
    isValid: hasId && hasName && hasPrice,
    score,
    checks,
    summary: `TradeIndia product validation score: ${score}/100`,
  };
}

// ── Quotation Mapping ─────────────────────────────────────────

export function mapTradeIndiaRfqToQuotation(
  raw: TradeIndiaRawRfqResponse,
  supplierId: string,
): AtlasQuotation {
  const unitPriceRaw = coalesce(raw.UNIT_PRICE, raw.unit_price);
  const unitPrice = unitPriceRaw !== null && unitPriceRaw !== undefined ? parseFloat(String(unitPriceRaw)) : 0;
  const quantity = coalesce(raw.QUANTITY, raw.quantity) ?? 1;
  const currency = normalizeCurrency(coalesce(raw.CURRENCY, raw.currency) ?? 'INR') ?? 'INR';
  const leadTimeRaw = coalesce(raw.LEAD_TIME, raw.lead_time);
  const leadTimeDays = leadTimeRaw ? parseInt(String(leadTimeRaw), 10) : null;
  const validUntilRaw = coalesce(raw.VALID_UNTIL, raw.valid_until);
  let validUntil: Date | null = null;
  if (validUntilRaw) {
    const d = new Date(validUntilRaw);
    validUntil = isNaN(d.getTime()) ? null : d;
  }

  const paymentTerms = coalesce(raw.PAYMENT_TERMS, raw.payment_terms) ?? null;
  const deliveryTerms = coalesce(raw.DELIVERY_TERMS, raw.delivery_terms) ?? null;
  const terms = [paymentTerms, deliveryTerms].filter(Boolean).join('; ') || null;

  return {
    providerCode: PROVIDER_CODE,
    providerQuotationId: coalesce(raw.RFQ_ID, raw.rfq_id, raw.INQUIRY_ID, raw.inquiry_id) ?? '',
    supplierId,
    productId: coalesce(raw.PRODUCT_ID, raw.product_id) ?? null,
    quantity: Number(quantity),
    unitPrice,
    totalPrice: unitPrice * Number(quantity),
    currency,
    leadTimeDays: leadTimeDays !== null && isFinite(leadTimeDays) ? leadTimeDays : null,
    validUntil,
    terms,
    rawData: raw as Record<string, unknown>,
  };
}

// ── Catalog Mapping ───────────────────────────────────────────

export function mapTradeIndiaCatalog(raw: TradeIndiaRawCatalog): AtlasProduct[] {
  const products = coalesce(raw.PRODUCTS, raw.products) ?? [];
  return products.map(mapTradeIndiaProduct);
}

// ── Helpers ───────────────────────────────────────────────────

function isTradeIndiaVerified(raw: TradeIndiaRawSupplier): boolean {
  return (
    isBoolish(coalesce(raw.IS_VERIFIED, raw.is_verified)) ||
    isBoolish(coalesce(raw.IS_PREMIUM, raw.is_premium)) ||
    isBoolish(coalesce(raw.IS_TRUSTED, raw.is_trusted))
  );
}

function resolveSupplierTier(raw: TradeIndiaRawSupplier): string | null {
  if (isBoolish(coalesce(raw.IS_PREMIUM, raw.is_premium))) return 'PREMIUM';
  if (isBoolish(coalesce(raw.IS_VERIFIED, raw.is_verified))) return 'VERIFIED';
  if (isBoolish(coalesce(raw.IS_TRUSTED, raw.is_trusted))) return 'TRUSTED';
  const memberType = (coalesce(raw.MEMBERSHIP_TYPE, raw.membership_type) ?? '').toLowerCase();
  if (memberType) return memberType.toUpperCase();
  return null;
}

function isBoolish(val: boolean | string | null | undefined): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  return val === '1' || val.toLowerCase() === 'yes' || val.toLowerCase() === 'true';
}

function parseRating(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = parseFloat(String(raw));
  return isFinite(n) ? n : null;
}

function parseCategories(
  catsArr: TradeIndiaRawCategory[] | null | undefined,
  mainProducts: string | null | undefined,
): string[] {
  if (catsArr?.length) {
    return catsArr
      .map((c) => c.CATEGORY_NAME ?? c.name ?? '')
      .filter(Boolean);
  }
  if (mainProducts?.trim()) {
    return mainProducts.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseImages(
  arr: TradeIndiaRawImage[] | null | undefined,
  singleUrl: string | null | undefined,
): string[] {
  if (arr?.length) {
    return arr.map((img) => img.IMAGE_URL ?? img.image_url ?? img.URL ?? img.url ?? '').filter(Boolean);
  }
  if (singleUrl) return [singleUrl];
  return [];
}

/** Returns the first non-null / non-undefined argument. */
function coalesce<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v !== null && v !== undefined) return v;
  }
  return null;
}
