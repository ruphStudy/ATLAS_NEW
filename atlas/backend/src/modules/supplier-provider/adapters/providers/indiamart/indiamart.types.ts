// =============================================================
// IndiaMART Adapter – Raw API Types
// These represent the shape of raw IndiaMART API responses.
// They are never exposed beyond the adapter boundary.
// =============================================================

// ── Raw Supplier (Seller) ─────────────────────────────────────

export interface IndiaMartRawSupplier {
  GLID?: string | null;
  name?: string | null;
  COMPANY_NAME?: string | null;
  city?: string | null;
  state?: string | null;
  COUNTRY?: string | null;
  phone_number?: string | null;
  email_id?: string | null;
  website?: string | null;
  MAIN_PRODUCTS?: string | null;
  YEARLY_TURNOVER?: string | null;
  EMPLOYEE_COUNT?: string | null;
  YEAR_OF_ESTABLISHMENT?: string | null;
  IS_INDIAMART_MEMBER?: string | null;
  RESPONSE_RATE?: string | null;
  RATING?: string | null;
  VERIFICATION_STATUS?: string | null;
  TRUST_SEAL?: string | null;
  CATEGORIES?: IndiaMartRawCategory[] | null;
  CERTIFICATIONS?: IndiaMartRawCertification[] | null;
  PRODUCT_COUNT?: number | null;
  profile_url?: string | null;
}

// ── Raw Product ────────────────────────────────────────────────

export interface IndiaMartRawProduct {
  PPID?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  PRODUCT_NAME?: string | null;
  description?: string | null;
  PRODUCT_DESCRIPTION?: string | null;
  category?: string | null;
  CATEGORY_NAME?: string | null;
  sub_category?: string | null;
  price?: string | null;
  MIN_PRICE?: string | null;
  MAX_PRICE?: string | null;
  PRICE?: string | null;
  UNIT?: string | null;
  CURRENCY?: string | null;
  MOQ?: string | null;
  MIN_ORDER_QUANTITY?: string | null;
  IMAGES?: IndiaMartRawImage[] | null;
  images?: string[] | null;
  SUPPLIER_GLID?: string | null;
  SUPPLIER_NAME?: string | null;
  ATTRIBUTES?: Record<string, string> | null;
  BRAND?: string | null;
  model?: string | null;
  product_url?: string | null;
}

// ── Raw Quotation / Lead Response ─────────────────────────────

export interface IndiaMartRawLeadResponse {
  LEAD_ID?: string | null;
  STATUS?: string | null;
  MESSAGE?: string | null;
  QUERY_ID?: string | null;
  rfq_id?: string | null;
  UNIT_PRICE?: string | null;
  QUANTITY?: string | null;
  CURRENCY?: string | null;
  LEAD_TIME?: string | null;
  VALID_TILL?: string | null;
  TERMS?: string | null;
  SUPPLIER_GLID?: string | null;
  PRODUCT_PPID?: string | null;
  CREATED_AT?: string | null;
}

// ── Raw Category ──────────────────────────────────────────────

export interface IndiaMartRawCategory {
  id?: string | null;
  name?: string | null;
  CATEGORY_NAME?: string | null;
}

// ── Raw Certification ─────────────────────────────────────────

export interface IndiaMartRawCertification {
  CERT_NAME?: string | null;
  CERT_NUMBER?: string | null;
  ISSUED_BY?: string | null;
  VALID_TILL?: string | null;
}

// ── Raw Image ─────────────────────────────────────────────────

export interface IndiaMartRawImage {
  url?: string | null;
  IMAGE_URL?: string | null;
  thumb?: string | null;
}

// ── Raw Catalog ───────────────────────────────────────────────

export interface IndiaMartRawCatalog {
  SUPPLIER_GLID?: string | null;
  PRODUCTS?: IndiaMartRawProduct[] | null;
  TOTAL_COUNT?: number | null;
  PAGE?: number | null;
}

// ── Raw API Envelope ──────────────────────────────────────────

export interface IndiaMartApiEnvelope<T = unknown> {
  Status?: number | null;
  CODE?: string | null;
  message?: string | null;
  MESSAGE?: string | null;
  Response?: T | null;
  data?: T | null;
  TOTAL_COUNT?: number | null;
  total?: number | null;
  error?: string | null;
  ERROR?: string | null;
}

// ── HTTP Client Request Options ────────────────────────────────

export interface IndiaMartRequestOptions {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
  timeoutMs?: number;
}
