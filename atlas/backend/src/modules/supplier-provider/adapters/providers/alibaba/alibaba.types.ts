// =============================================================
// Alibaba Adapter – Raw API Types
// Represents raw shapes from Alibaba Open Platform API responses.
// Never exposed beyond the adapter boundary.
// =============================================================

// ── Raw API Envelope ──────────────────────────────────────────

export interface AlibabaApiEnvelope<T = unknown> {
  result?: AlibabaResultWrapper<T> | null;
  error_response?: AlibabaErrorResponse | null;
  request_id?: string | null;
}

export interface AlibabaResultWrapper<T = unknown> {
  success?: boolean;
  total_count?: number | null;
  result?: T | null;
  result_list?: T[] | null;
}

export interface AlibabaErrorResponse {
  code?: number | string | null;
  msg?: string | null;
  sub_code?: string | null;
  sub_msg?: string | null;
  request_id?: string | null;
}

// ── Raw Supplier (Company) ────────────────────────────────────

export interface AlibabaRawSupplier {
  member_id?: string | null;
  login_id?: string | null;
  company_name?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  contact_person?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  website?: string | null;
  main_products?: string | null;
  business_type?: string | null;
  ownership_type?: string | null;
  year_established?: string | null;
  employees_count?: string | null;
  annual_revenue?: string | null;
  factory_size?: string | null;
  export_markets?: string | null;
  response_rate?: string | null;
  response_time?: string | null;
  years_on_alibaba?: number | null;
  is_verified_supplier?: boolean | null;
  is_gold_supplier?: boolean | null;
  is_trade_assurance?: boolean | null;
  is_assessed?: boolean | null;
  trade_assurance_limit?: string | null;
  certifications?: AlibabaRawCertification[] | null;
  audit_reports?: AlibabaRawAuditReport[] | null;
  product_categories?: AlibabaRawCategory[] | null;
  profile_url?: string | null;
  logo_url?: string | null;
  overview?: string | null;
}

// ── Raw Product ────────────────────────────────────────────────

export interface AlibabaRawProduct {
  product_id?: string | null;
  subject?: string | null;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  brand_name?: string | null;
  model_number?: string | null;
  unit?: string | null;
  moq?: string | null;
  min_order_quantity?: number | null;
  price_range?: string | null;
  price_unit?: string | null;
  price_info?: AlibabaRawPriceInfo | null;
  price_tiers?: AlibabaRawPriceTier[] | null;
  currency?: string | null;
  images?: AlibabaRawImage[] | null;
  videos?: AlibabaRawVideo[] | null;
  specifications?: Record<string, string> | null;
  attributes?: AlibabaRawAttribute[] | null;
  variants?: AlibabaRawVariant[] | null;
  sample_available?: boolean | null;
  sample_price?: string | null;
  lead_time?: string | null;
  production_time?: string | null;
  production_capacity?: string | null;
  customization?: string | null;
  packaging_details?: string | null;
  shipping_methods?: string[] | null;
  supplier_member_id?: string | null;
  supplier_company_name?: string | null;
  is_customizable?: boolean | null;
  sub_category?: string | null;
  product_url?: string | null;
}

// ── Price Info / Tiers ────────────────────────────────────────

export interface AlibabaRawPriceInfo {
  price?: string | null;
  currency?: string | null;
  unit?: string | null;
}

export interface AlibabaRawPriceTier {
  quantity_from?: number | null;
  quantity_to?: number | null;
  price?: string | null;
  currency?: string | null;
}

// ── Variants ──────────────────────────────────────────────────

export interface AlibabaRawVariant {
  sku_id?: string | null;
  attributes?: AlibabaRawAttribute[] | null;
  price?: string | null;
  currency?: string | null;
  quantity?: number | null;
  image_url?: string | null;
}

// ── Attribute ─────────────────────────────────────────────────

export interface AlibabaRawAttribute {
  attribute_name?: string | null;
  attribute_value?: string | null;
}

// ── Images / Videos ───────────────────────────────────────────

export interface AlibabaRawImage {
  url?: string | null;
  image_url?: string | null;
  is_main?: boolean | null;
}

export interface AlibabaRawVideo {
  url?: string | null;
  thumbnail?: string | null;
  title?: string | null;
}

// ── Certification ─────────────────────────────────────────────

export interface AlibabaRawCertification {
  cert_name?: string | null;
  cert_number?: string | null;
  issued_by?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
}

// ── Audit Report ─────────────────────────────────────────────

export interface AlibabaRawAuditReport {
  report_type?: string | null;
  report_date?: string | null;
  auditor?: string | null;
  status?: string | null;
}

// ── Category ─────────────────────────────────────────────────

export interface AlibabaRawCategory {
  category_id?: string | null;
  category_name?: string | null;
}

// ── RFQ Response ──────────────────────────────────────────────

export interface AlibabaRawRfqResponse {
  rfq_id?: string | null;
  inquiry_id?: string | null;
  status?: string | null;
  message?: string | null;
  supplier_member_id?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unit_price?: string | null;
  total_price?: string | null;
  currency?: string | null;
  lead_time?: string | null;
  valid_until?: string | null;
  payment_terms?: string | null;
  shipping_terms?: string | null;
  incoterms?: string | null;
  sample_cost?: string | null;
  packaging_cost?: string | null;
  customization_cost?: string | null;
  production_time?: string | null;
  trade_assurance?: boolean | null;
  created_at?: string | null;
}

// ── Purchase Order Response ───────────────────────────────────

export interface AlibabaRawOrderResponse {
  order_id?: string | null;
  trade_order_id?: string | null;
  status?: string | null;
  message?: string | null;
  total_amount?: string | null;
  currency?: string | null;
  payment_method?: string | null;
  trade_assurance?: boolean | null;
  created_at?: string | null;
}

// ── Shipment Tracking ─────────────────────────────────────────

export interface AlibabaRawShipmentTracking {
  logistics_no?: string | null;
  carrier?: string | null;
  status?: string | null;
  current_location?: string | null;
  estimated_delivery?: string | null;
  events?: AlibabaRawTrackingEvent[] | null;
  updated_at?: string | null;
}

export interface AlibabaRawTrackingEvent {
  timestamp?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
}

// ── Token Refresh Response ────────────────────────────────────

export interface AlibabaTokenRefreshResponse {
  w2_expires_in?: number | null;
  r2_expires_in?: number | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expire_time?: number | null;
  r1_expires_in?: number | null;
  w1_expires_in?: number | null;
}

// ── Catalog Response ──────────────────────────────────────────

export interface AlibabaRawCatalog {
  supplier_member_id?: string | null;
  products?: AlibabaRawProduct[] | null;
  total_count?: number | null;
  page?: number | null;
  page_size?: number | null;
}

// ── HTTP Client Request Options ────────────────────────────────

export interface AlibabaRequestOptions {
  method: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
}
