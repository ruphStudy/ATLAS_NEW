// =============================================================
// TradeIndia Adapter – Raw API Types
// =============================================================

// ── Raw API Envelope ──────────────────────────────────────────

export interface TradeIndiaApiEnvelope<T = unknown> {
  status?: string | number | null;
  STATUS?: string | number | null;
  message?: string | null;
  MESSAGE?: string | null;
  error?: string | null;
  ERROR?: string | null;
  data?: T | null;
  DATA?: T | null;
  result?: T | null;
  RESULT?: T | null;
  total_count?: number | null;
  TOTAL_COUNT?: number | null;
}

// ── Raw Supplier ──────────────────────────────────────────────

export interface TradeIndiaRawSupplier {
  seller_id?: string | null;
  SELLER_ID?: string | null;
  company_name?: string | null;
  COMPANY_NAME?: string | null;
  name?: string | null;
  city?: string | null;
  CITY?: string | null;
  state?: string | null;
  STATE?: string | null;
  country?: string | null;
  COUNTRY?: string | null;
  address?: string | null;
  ADDRESS?: string | null;
  phone?: string | null;
  PHONE?: string | null;
  mobile?: string | null;
  MOBILE?: string | null;
  email?: string | null;
  EMAIL?: string | null;
  website?: string | null;
  WEBSITE?: string | null;
  business_type?: string | null;
  BUSINESS_TYPE?: string | null;
  main_products?: string | null;
  MAIN_PRODUCTS?: string | null;
  categories?: TradeIndiaRawCategory[] | null;
  CATEGORIES?: TradeIndiaRawCategory[] | null;
  membership_type?: string | null;
  MEMBERSHIP_TYPE?: string | null;
  is_verified?: boolean | string | null;
  IS_VERIFIED?: boolean | string | null;
  is_premium?: boolean | string | null;
  IS_PREMIUM?: boolean | string | null;
  is_trusted?: boolean | string | null;
  IS_TRUSTED?: boolean | string | null;
  rating?: string | number | null;
  RATING?: string | number | null;
  certifications?: TradeIndiaRawCertification[] | null;
  CERTIFICATIONS?: TradeIndiaRawCertification[] | null;
  year_established?: string | null;
  YEAR_ESTABLISHED?: string | null;
  employee_count?: string | null;
  EMPLOYEE_COUNT?: string | null;
  annual_turnover?: string | null;
  ANNUAL_TURNOVER?: string | null;
  profile_url?: string | null;
  PROFILE_URL?: string | null;
}

// ── Raw Product ───────────────────────────────────────────────

export interface TradeIndiaRawProduct {
  product_id?: string | null;
  PRODUCT_ID?: string | null;
  product_name?: string | null;
  PRODUCT_NAME?: string | null;
  description?: string | null;
  DESCRIPTION?: string | null;
  category?: string | null;
  CATEGORY?: string | null;
  sub_category?: string | null;
  SUB_CATEGORY?: string | null;
  price?: string | number | null;
  PRICE?: string | number | null;
  min_price?: string | number | null;
  MIN_PRICE?: string | number | null;
  currency?: string | null;
  CURRENCY?: string | null;
  unit?: string | null;
  UNIT?: string | null;
  moq?: string | number | null;
  MOQ?: string | number | null;
  images?: TradeIndiaRawImage[] | null;
  IMAGES?: TradeIndiaRawImage[] | null;
  image_url?: string | null;
  IMAGE_URL?: string | null;
  specifications?: Record<string, string> | null;
  SPECIFICATIONS?: Record<string, string> | null;
  attributes?: Record<string, string> | null;
  ATTRIBUTES?: Record<string, string> | null;
  seller_id?: string | null;
  SELLER_ID?: string | null;
  seller_name?: string | null;
  SELLER_NAME?: string | null;
  availability?: string | null;
  AVAILABILITY?: string | null;
  brand?: string | null;
  BRAND?: string | null;
  product_url?: string | null;
  PRODUCT_URL?: string | null;
}

// ── Raw Quotation / RFQ ───────────────────────────────────────

export interface TradeIndiaRawRfqResponse {
  rfq_id?: string | null;
  RFQ_ID?: string | null;
  inquiry_id?: string | null;
  INQUIRY_ID?: string | null;
  status?: string | null;
  STATUS?: string | null;
  unit_price?: string | number | null;
  UNIT_PRICE?: string | number | null;
  quantity?: number | null;
  QUANTITY?: number | null;
  currency?: string | null;
  CURRENCY?: string | null;
  lead_time?: string | null;
  LEAD_TIME?: string | null;
  valid_until?: string | null;
  VALID_UNTIL?: string | null;
  payment_terms?: string | null;
  PAYMENT_TERMS?: string | null;
  delivery_terms?: string | null;
  DELIVERY_TERMS?: string | null;
  seller_id?: string | null;
  SELLER_ID?: string | null;
  product_id?: string | null;
  PRODUCT_ID?: string | null;
}

// ── Raw Category ──────────────────────────────────────────────

export interface TradeIndiaRawCategory {
  id?: string | null;
  name?: string | null;
  CATEGORY_NAME?: string | null;
}

// ── Raw Certification ─────────────────────────────────────────

export interface TradeIndiaRawCertification {
  cert_name?: string | null;
  CERT_NAME?: string | null;
  cert_number?: string | null;
  CERT_NUMBER?: string | null;
  issued_by?: string | null;
  ISSUED_BY?: string | null;
  valid_till?: string | null;
  VALID_TILL?: string | null;
}

// ── Raw Image ─────────────────────────────────────────────────

export interface TradeIndiaRawImage {
  url?: string | null;
  URL?: string | null;
  image_url?: string | null;
  IMAGE_URL?: string | null;
}

// ── Raw Catalog ───────────────────────────────────────────────

export interface TradeIndiaRawCatalog {
  seller_id?: string | null;
  SELLER_ID?: string | null;
  products?: TradeIndiaRawProduct[] | null;
  PRODUCTS?: TradeIndiaRawProduct[] | null;
  total_count?: number | null;
  TOTAL_COUNT?: number | null;
}

// ── HTTP Request Options ──────────────────────────────────────

export interface TradeIndiaRequestOptions {
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  method?: 'GET' | 'POST';
  timeoutMs?: number;
}
