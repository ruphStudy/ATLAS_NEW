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
  normalizeVerificationStatus,
} from '../../adapter.mappers';
import {
  IndiaMartRawCatalog,
  IndiaMartRawCertification,
  IndiaMartRawImage,
  IndiaMartRawLeadResponse,
  IndiaMartRawProduct,
  IndiaMartRawSupplier,
} from './indiamart.types';
import { INDIAMART_VERIFICATION_STATUSES } from './indiamart.constants';

const PROVIDER_CODE = SupplierProviderCode.INDIAMART;

// ── Supplier Mapping ──────────────────────────────────────────

export function mapIndiaMartSupplier(raw: IndiaMartRawSupplier): AtlasSupplier {
  const supplierId = (raw.GLID ?? '').trim();
  const categories = parseCategories(raw.MAIN_PRODUCTS, raw.CATEGORIES);
  const isVerified = isIndiaMartVerified(raw);
  const overallRating = parseFloat(raw.RATING ?? '') || null;
  const country = normalizeCountry(raw.COUNTRY ?? 'IN') ?? 'IN';

  return {
    providerCode: PROVIDER_CODE,
    providerSupplierId: supplierId,
    name: raw.COMPANY_NAME ?? raw.name ?? '',
    country,
    city: raw.city ?? null,
    website: raw.website ?? null,
    contactEmail: raw.email_id ?? null,
    contactPhone: raw.phone_number ?? null,
    categories,
    minOrderQuantity: null,
    avgLeadTimeDays: null,
    overallRating: isFinite(overallRating as number) ? overallRating : null,
    isVerified,
    tier: resolveSupplierTier(raw),
    rawData: raw as Record<string, unknown>,
  };
}

export function mapIndiaMartSupplierValidation(raw: IndiaMartRawSupplier): AtlasValidationResult {
  const checks: AtlasValidationCheck[] = [
    {
      checkName: 'has_glid',
      passed: !!raw.GLID?.trim(),
      score: raw.GLID?.trim() ? 20 : 0,
      notes: raw.GLID ? null : 'Supplier GLID missing',
    },
    {
      checkName: 'has_company_name',
      passed: !!(raw.COMPANY_NAME ?? raw.name)?.trim(),
      score: (raw.COMPANY_NAME ?? raw.name)?.trim() ? 20 : 0,
      notes: null,
    },
    {
      checkName: 'is_verified',
      passed: isIndiaMartVerified(raw),
      score: isIndiaMartVerified(raw) ? 30 : 0,
      notes: raw.VERIFICATION_STATUS ?? null,
    },
    {
      checkName: 'has_contact_info',
      passed: !!(raw.phone_number || raw.email_id),
      score: raw.phone_number || raw.email_id ? 15 : 0,
      notes: null,
    },
    {
      checkName: 'has_categories',
      passed: parseCategories(raw.MAIN_PRODUCTS, raw.CATEGORIES).length > 0,
      score: parseCategories(raw.MAIN_PRODUCTS, raw.CATEGORIES).length > 0 ? 15 : 0,
      notes: null,
    },
  ];

  const score = checks.reduce((sum, c) => sum + c.score, 0);
  const allRequired = checks.slice(0, 3).every((c) => c.passed);

  return {
    isValid: allRequired && score >= 50,
    score,
    checks,
    summary: `IndiaMART supplier validation score: ${score}/100`,
  };
}

// ── Product Mapping ───────────────────────────────────────────

export function mapIndiaMartProduct(raw: IndiaMartRawProduct): AtlasProduct {
  const productId = (raw.PPID ?? raw.product_id ?? '').trim();
  const name = raw.PRODUCT_NAME ?? raw.product_name ?? '';
  const description = raw.PRODUCT_DESCRIPTION ?? raw.description ?? null;
  const category = raw.CATEGORY_NAME ?? raw.category ?? null;
  const subCategory = raw.sub_category ?? null;
  const brand = raw.BRAND ?? raw.model ?? null;

  const rawPrice = raw.PRICE ?? raw.MIN_PRICE ?? raw.price;
  const unitPrice = rawPrice ? parseFloat(rawPrice) : null;
  const currency = normalizeCurrency(raw.CURRENCY ?? 'INR');
  const unit = normalizeUnit(raw.UNIT ?? null);
  const moq = parseFloat(raw.MIN_ORDER_QUANTITY ?? raw.MOQ ?? '') || null;

  const images = parseImages(raw.IMAGES, raw.images);
  const attributes = raw.ATTRIBUTES ?? {};

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
    supplierProviderSupplierId: raw.SUPPLIER_GLID ?? null,
    rawData: raw as Record<string, unknown>,
  };
}

export function mapIndiaMartProductValidation(raw: IndiaMartRawProduct): AtlasValidationResult {
  const hasId = !!(raw.PPID ?? raw.product_id)?.trim();
  const hasName = !!(raw.PRODUCT_NAME ?? raw.product_name)?.trim();
  const hasPrice = !!(raw.PRICE ?? raw.MIN_PRICE ?? raw.price);
  const hasCategory = !!(raw.CATEGORY_NAME ?? raw.category);
  const hasImages = parseImages(raw.IMAGES, raw.images).length > 0;

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
    summary: `IndiaMART product validation score: ${score}/100`,
  };
}

// ── Quotation Mapping ─────────────────────────────────────────

export function mapIndiaMartLeadToQuotation(
  raw: IndiaMartRawLeadResponse,
  supplierId: string,
): AtlasQuotation {
  const unitPrice = parseFloat(raw.UNIT_PRICE ?? '0') || 0;
  const quantity = parseFloat(raw.QUANTITY ?? '1') || 1;
  const currency = normalizeCurrency(raw.CURRENCY ?? 'INR') ?? 'INR';
  const leadTimeDays = parseInt(raw.LEAD_TIME ?? '', 10) || null;

  let validUntil: Date | null = null;
  if (raw.VALID_TILL) {
    const d = new Date(raw.VALID_TILL);
    validUntil = isNaN(d.getTime()) ? null : d;
  }

  return {
    providerCode: PROVIDER_CODE,
    providerQuotationId: raw.LEAD_ID ?? raw.rfq_id ?? raw.QUERY_ID ?? '',
    supplierId,
    productId: raw.PRODUCT_PPID ?? null,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
    currency,
    leadTimeDays: leadTimeDays && isFinite(leadTimeDays) ? leadTimeDays : null,
    validUntil,
    terms: raw.TERMS ?? null,
    rawData: raw as Record<string, unknown>,
  };
}

// ── Catalog Mapping ───────────────────────────────────────────

export function mapIndiaMartCatalog(raw: IndiaMartRawCatalog): AtlasProduct[] {
  const products = raw.PRODUCTS ?? [];
  return products.map(mapIndiaMartProduct);
}

// ── Helpers ───────────────────────────────────────────────────

function isIndiaMartVerified(raw: IndiaMartRawSupplier): boolean {
  const verificationStr = (raw.VERIFICATION_STATUS ?? '').toLowerCase();
  const hasTrustSeal = (raw.TRUST_SEAL ?? '').toLowerCase() === 'yes' || verificationStr.includes('trustseal') || verificationStr.includes('verified');
  const isMember = (raw.IS_INDIAMART_MEMBER ?? '').toLowerCase() === 'yes';
  return hasTrustSeal || isMember;
}

function resolveSupplierTier(raw: IndiaMartRawSupplier): string | null {
  const v = (raw.VERIFICATION_STATUS ?? '').toLowerCase();
  if (v.includes('trustseal')) return 'TRUST_SEAL';
  if (v.includes('verified')) return 'VERIFIED';
  if (raw.IS_INDIAMART_MEMBER?.toLowerCase() === 'yes') return 'MEMBER';
  return null;
}

function parseCategories(
  mainProducts: string | null | undefined,
  rawCategories: IndiaMartRawSupplier['CATEGORIES'],
): string[] {
  const cats: string[] = [];
  if (rawCategories?.length) {
    for (const c of rawCategories) {
      const name = c.CATEGORY_NAME ?? c.name ?? '';
      if (name.trim()) cats.push(name.trim());
    }
  } else if (mainProducts?.trim()) {
    cats.push(...mainProducts.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return cats;
}

function parseImages(
  rawImages: IndiaMartRawImage[] | null | undefined,
  plainUrls: string[] | null | undefined,
): string[] {
  if (rawImages?.length) {
    return rawImages
      .map((img) => img.IMAGE_URL ?? img.url ?? '')
      .filter(Boolean);
  }
  if (plainUrls?.length) return plainUrls.filter(Boolean);
  return [];
}
