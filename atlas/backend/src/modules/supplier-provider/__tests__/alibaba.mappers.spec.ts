import {
  mapAlibabaSupplier,
  mapAlibabaSupplierValidation,
  mapAlibabaProduct,
  mapAlibabaProductValidation,
  mapAlibabaRfqToQuotation,
  mapAlibabaPriceTiers,
  mapAlibabaOrderResponse,
  mapAlibabaShipmentTracking,
  mapAlibabaCatalog,
} from '../alibaba/alibaba.mappers';
import { SupplierProviderCode } from '../../../interfaces';
import {
  AlibabaRawSupplier,
  AlibabaRawProduct,
  AlibabaRawRfqResponse,
  AlibabaRawOrderResponse,
  AlibabaRawShipmentTracking,
  AlibabaRawCatalog,
} from '../alibaba/alibaba.types';

// ── Fixtures ──────────────────────────────────────────────────

const SUPPLIER_FIXTURE: AlibabaRawSupplier = {
  member_id: 'alibaba_member_001',
  company_name: 'SteelPro Manufacturing Co., Ltd.',
  country: 'CN',
  city: 'Shanghai',
  email: 'info@steelpro.com',
  phone: '+86-21-12345678',
  website: 'https://steelpro.en.alibaba.com',
  main_products: 'Steel Pipes, Aluminum Sheets, Copper Wire',
  business_type: 'Manufacturer',
  years_on_alibaba: 8,
  response_rate: '98%',
  is_verified_supplier: true,
  is_gold_supplier: true,
  is_trade_assurance: true,
  is_assessed: true,
  certifications: [{ cert_name: 'ISO 9001', cert_number: 'CN123', issued_by: 'TUV', valid_to: '2027-01-01' }],
};

const PRODUCT_FIXTURE: AlibabaRawProduct = {
  product_id: 'prod_abc_001',
  subject: 'SS 304 Stainless Steel Pipe',
  description: 'High quality stainless steel seamless pipe',
  category_name: 'Steel Pipes',
  sub_category: 'Stainless Steel',
  brand_name: 'SteelPro',
  unit: 'Meter',
  min_order_quantity: 50,
  price_info: { price: '15.50', currency: 'USD', unit: 'Meter' },
  price_tiers: [
    { quantity_from: 1, quantity_to: 99, price: '18.00', currency: 'USD' },
    { quantity_from: 100, quantity_to: 499, price: '15.50', currency: 'USD' },
    { quantity_from: 500, quantity_to: null, price: '13.00', currency: 'USD' },
  ],
  currency: 'USD',
  images: [
    { image_url: 'https://sc04.alicdn.com/kf/product1.jpg', is_main: true },
    { url: 'https://sc04.alicdn.com/kf/product2.jpg', is_main: false },
  ],
  attributes: [
    { attribute_name: 'Grade', attribute_value: '304' },
    { attribute_name: 'Thickness', attribute_value: '2mm' },
  ],
  specifications: { standard: 'ASTM A312', surface: 'Polished' },
  supplier_member_id: 'alibaba_member_001',
  sample_available: true,
  lead_time: '15-20 days',
  production_capacity: '500 Tons/Month',
};

const RFQ_FIXTURE: AlibabaRawRfqResponse = {
  rfq_id: 'rfq_xyz_001',
  inquiry_id: 'inq_001',
  status: 'SENT',
  supplier_member_id: 'alibaba_member_001',
  product_id: 'prod_abc_001',
  quantity: 200,
  unit: 'Meter',
  unit_price: '14.00',
  total_price: '2800.00',
  currency: 'USD',
  lead_time: '20',
  valid_until: '2026-10-01',
  payment_terms: 'T/T',
  shipping_terms: 'FOB',
  incoterms: 'FOB Shanghai',
  trade_assurance: true,
};

// ── Supplier Mapping ──────────────────────────────────────────

describe('mapAlibabaSupplier', () => {
  it('maps core fields correctly', () => {
    const result = mapAlibabaSupplier(SUPPLIER_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.ALIBABA);
    expect(result.providerSupplierId).toBe('alibaba_member_001');
    expect(result.name).toBe('SteelPro Manufacturing Co., Ltd.');
    expect(result.country).toBe('CN');
    expect(result.city).toBe('Shanghai');
    expect(result.contactEmail).toBe('info@steelpro.com');
    expect(result.contactPhone).toBe('+86-21-12345678');
    expect(result.website).toBe('https://steelpro.en.alibaba.com');
    expect(result.isVerified).toBe(true);
    expect(result.tier).toBe('VERIFIED_SUPPLIER');
  });

  it('maps categories from main_products when no category array', () => {
    const result = mapAlibabaSupplier(SUPPLIER_FIXTURE);
    expect(result.categories).toContain('Steel Pipes');
    expect(result.categories).toContain('Aluminum Sheets');
  });

  it('maps categories from product_categories array when present', () => {
    const raw: AlibabaRawSupplier = {
      ...SUPPLIER_FIXTURE,
      product_categories: [
        { category_id: '1', category_name: 'Metals' },
        { category_id: '2', category_name: 'Hardware' },
      ],
    };
    const result = mapAlibabaSupplier(raw);
    expect(result.categories).toContain('Metals');
    expect(result.categories).toContain('Hardware');
    expect(result.categories).not.toContain('Steel Pipes');
  });

  it('marks unverified supplier correctly', () => {
    const raw: AlibabaRawSupplier = {
      member_id: 'G2',
      company_name: 'Unverified Co',
      is_verified_supplier: false,
      is_gold_supplier: false,
      is_assessed: false,
    };
    const result = mapAlibabaSupplier(raw);
    expect(result.isVerified).toBe(false);
    expect(result.tier).toBeNull();
  });

  it('assigns GOLD_SUPPLIER tier when gold but not verified', () => {
    const raw: AlibabaRawSupplier = {
      ...SUPPLIER_FIXTURE,
      is_verified_supplier: false,
      is_gold_supplier: true,
    };
    const result = mapAlibabaSupplier(raw);
    expect(result.tier).toBe('GOLD_SUPPLIER');
  });

  it('handles missing optional fields gracefully', () => {
    const raw: AlibabaRawSupplier = { member_id: 'M1', company_name: 'Minimal Co' };
    const result = mapAlibabaSupplier(raw);
    expect(result.website).toBeNull();
    expect(result.contactEmail).toBeNull();
    expect(result.overallRating).toBeNull();
    expect(result.categories).toHaveLength(0);
  });

  it('preserves rawData', () => {
    const result = mapAlibabaSupplier(SUPPLIER_FIXTURE);
    expect(result.rawData).toMatchObject({ member_id: 'alibaba_member_001' });
  });
});

// ── Supplier Validation ───────────────────────────────────────

describe('mapAlibabaSupplierValidation', () => {
  it('produces high score for fully verified supplier', () => {
    const result = mapAlibabaSupplierValidation(SUPPLIER_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('fails for minimal supplier with no verification', () => {
    const result = mapAlibabaSupplierValidation({ member_id: '', company_name: '' });
    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(40);
  });

  it('includes platform tenure in score', () => {
    const result = mapAlibabaSupplierValidation({ ...SUPPLIER_FIXTURE, years_on_alibaba: 10 });
    const tenureCheck = result.checks.find((c) => c.checkName === 'platform_tenure');
    expect(tenureCheck?.passed).toBe(true);
    expect(tenureCheck?.notes).toContain('years on Alibaba');
  });
});

// ── Product Mapping ───────────────────────────────────────────

describe('mapAlibabaProduct', () => {
  it('maps all core fields', () => {
    const result = mapAlibabaProduct(PRODUCT_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.ALIBABA);
    expect(result.providerProductId).toBe('prod_abc_001');
    expect(result.name).toBe('SS 304 Stainless Steel Pipe');
    expect(result.description).toBe('High quality stainless steel seamless pipe');
    expect(result.category).toBe('Steel Pipes');
    expect(result.subCategory).toBe('Stainless Steel');
    expect(result.brand).toBe('SteelPro');
    expect(result.unitPrice).toBe(15.5);
    expect(result.currency).toBe('USD');
    expect(result.minOrderQuantity).toBe(50);
    expect(result.supplierProviderSupplierId).toBe('alibaba_member_001');
  });

  it('maps images from image_url', () => {
    const result = mapAlibabaProduct(PRODUCT_FIXTURE);
    expect(result.images).toContain('https://sc04.alicdn.com/kf/product1.jpg');
    expect(result.images).toContain('https://sc04.alicdn.com/kf/product2.jpg');
  });

  it('merges attributes and specifications', () => {
    const result = mapAlibabaProduct(PRODUCT_FIXTURE);
    expect(result.attributes['Grade']).toBe('304');
    expect(result.attributes['standard']).toBe('ASTM A312');
  });

  it('falls back to price_range when no price_info', () => {
    const raw: AlibabaRawProduct = {
      ...PRODUCT_FIXTURE,
      price_info: null,
      price_tiers: null,
      price_range: '10.00-20.00',
    };
    const result = mapAlibabaProduct(raw);
    expect(result.unitPrice).toBe(10);
  });

  it('uses lowest tier price when price_info absent', () => {
    const raw: AlibabaRawProduct = {
      ...PRODUCT_FIXTURE,
      price_info: null,
      price_tiers: [
        { quantity_from: 1, quantity_to: 99, price: '20.00', currency: 'USD' },
        { quantity_from: 100, quantity_to: null, price: '15.00', currency: 'USD' },
      ],
    };
    const result = mapAlibabaProduct(raw);
    expect(result.unitPrice).toBe(20); // lowest tier (lowest qty)
  });

  it('handles missing price gracefully', () => {
    const result = mapAlibabaProduct({ product_id: 'P1', subject: 'Item' });
    expect(result.unitPrice).toBeNull();
    expect(result.minOrderQuantity).toBeNull();
  });
});

// ── Tiered Price Mapping ──────────────────────────────────────

describe('mapAlibabaPriceTiers', () => {
  it('maps all tiers with currency normalization', () => {
    const tiers = PRODUCT_FIXTURE.price_tiers!;
    const result = mapAlibabaPriceTiers(tiers, 'USD');
    expect(result).toHaveLength(3);
    expect(result[0]!.quantityFrom).toBe(1);
    expect(result[0]!.unitPrice).toBe(18);
    expect(result[0]!.currency).toBe('USD');
    expect(result[2]!.quantityTo).toBeNull();
    expect(result[2]!.unitPrice).toBe(13);
  });

  it('returns empty array for null tiers', () => {
    expect(mapAlibabaPriceTiers(null, 'USD')).toHaveLength(0);
  });

  it('uses fallback currency when tier has none', () => {
    const result = mapAlibabaPriceTiers([{ quantity_from: 1, price: '5.00' }], 'EUR');
    expect(result[0]!.currency).toBe('EUR');
  });

  it('normalizes RS to INR', () => {
    const result = mapAlibabaPriceTiers([{ quantity_from: 1, price: '500', currency: 'RS' }], null);
    expect(result[0]!.currency).toBe('INR');
  });
});

// ── RFQ / Quotation Mapping ───────────────────────────────────

describe('mapAlibabaRfqToQuotation', () => {
  it('maps all fields', () => {
    const result = mapAlibabaRfqToQuotation(RFQ_FIXTURE, 'alibaba_member_001');
    expect(result.providerCode).toBe(SupplierProviderCode.ALIBABA);
    expect(result.providerQuotationId).toBe('rfq_xyz_001');
    expect(result.supplierId).toBe('alibaba_member_001');
    expect(result.productId).toBe('prod_abc_001');
    expect(result.unitPrice).toBe(14);
    expect(result.quantity).toBe(200);
    expect(result.totalPrice).toBe(2800);
    expect(result.currency).toBe('USD');
    expect(result.leadTimeDays).toBe(20);
  });

  it('parses validUntil date', () => {
    const result = mapAlibabaRfqToQuotation(RFQ_FIXTURE, 'S1');
    expect(result.validUntil).toBeInstanceOf(Date);
  });

  it('builds combined terms string', () => {
    const result = mapAlibabaRfqToQuotation(RFQ_FIXTURE, 'S1');
    expect(result.terms).toContain('T/T');
    expect(result.terms).toContain('FOB');
  });

  it('calculates totalPrice from unit*qty when total_price absent', () => {
    const raw: AlibabaRawRfqResponse = {
      rfq_id: 'R1',
      unit_price: '10.00',
      quantity: 50,
      currency: 'USD',
    };
    const result = mapAlibabaRfqToQuotation(raw, 'S1');
    expect(result.totalPrice).toBe(500);
  });

  it('handles missing optional fields', () => {
    const result = mapAlibabaRfqToQuotation({ rfq_id: 'R2' }, 'S1');
    expect(result.unitPrice).toBe(0);
    expect(result.quantity).toBe(1);
    expect(result.validUntil).toBeNull();
    expect(result.leadTimeDays).toBeNull();
    expect(result.terms).toBeNull();
  });
});

// ── Order Reference Mapping ───────────────────────────────────

describe('mapAlibabaOrderResponse', () => {
  it('maps order reference fields', () => {
    const raw: AlibabaRawOrderResponse = {
      order_id: 'ORDER_001',
      trade_order_id: 'TRADE_001',
      status: 'PENDING',
      total_amount: '2800.00',
      currency: 'USD',
      trade_assurance: true,
      created_at: '2026-07-17T00:00:00Z',
    };
    const result = mapAlibabaOrderResponse(raw);
    expect(result.providerOrderId).toBe('ORDER_001');
    expect(result.tradeOrderId).toBe('TRADE_001');
    expect(result.totalAmount).toBe(2800);
    expect(result.currency).toBe('USD');
    expect(result.tradeAssurance).toBe(true);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it('handles missing fields gracefully', () => {
    const result = mapAlibabaOrderResponse({});
    expect(result.providerOrderId).toBe('');
    expect(result.totalAmount).toBeNull();
    expect(result.tradeAssurance).toBe(false);
  });
});

// ── Shipment Tracking Mapping ─────────────────────────────────

describe('mapAlibabaShipmentTracking', () => {
  it('maps all tracking fields', () => {
    const raw: AlibabaRawShipmentTracking = {
      logistics_no: 'YT1234567890',
      carrier: 'YTO Express',
      status: 'IN_TRANSIT',
      current_location: 'Shanghai Hub',
      estimated_delivery: '2026-08-01',
      events: [
        { timestamp: '2026-07-20T10:00:00Z', location: 'Shanghai', description: 'Picked up', status: 'PICKED_UP' },
      ],
    };
    const result = mapAlibabaShipmentTracking(raw);
    expect(result.logisticsNo).toBe('YT1234567890');
    expect(result.carrier).toBe('YTO Express');
    expect(result.status).toBe('IN_TRANSIT');
    expect(result.normalizedStatus).toBe('IN_TRANSIT');
    expect(result.currentLocation).toBe('Shanghai Hub');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.location).toBe('Shanghai');
    expect(result.estimatedDelivery).toBeInstanceOf(Date);
  });

  it('maps unknown status to raw status', () => {
    const result = mapAlibabaShipmentTracking({ status: 'CUSTOMS_HOLD' });
    expect(result.normalizedStatus).toBe('CUSTOMS_HOLD');
  });

  it('handles missing fields gracefully', () => {
    const result = mapAlibabaShipmentTracking({});
    expect(result.logisticsNo).toBeNull();
    expect(result.events).toHaveLength(0);
    expect(result.estimatedDelivery).toBeNull();
  });
});

// ── Catalog Mapping ───────────────────────────────────────────

describe('mapAlibabaCatalog', () => {
  it('maps all products in catalog', () => {
    const catalog: AlibabaRawCatalog = {
      supplier_member_id: 'alibaba_member_001',
      products: [PRODUCT_FIXTURE, { ...PRODUCT_FIXTURE, product_id: 'P2', subject: 'Copper Wire' }],
      total_count: 2,
    };
    const result = mapAlibabaCatalog(catalog);
    expect(result).toHaveLength(2);
    expect(result[0]!.providerProductId).toBe('prod_abc_001');
    expect(result[1]!.name).toBe('Copper Wire');
  });

  it('returns empty for empty catalog', () => {
    expect(mapAlibabaCatalog({ products: [] })).toHaveLength(0);
  });
});

// ── Product Validation ────────────────────────────────────────

describe('mapAlibabaProductValidation', () => {
  it('passes for fully populated product', () => {
    const result = mapAlibabaProductValidation(PRODUCT_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('fails for empty product', () => {
    const result = mapAlibabaProductValidation({});
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
  });
});

// ── Currency / Unit Normalization ─────────────────────────────

describe('currency and unit normalization in Alibaba mapper', () => {
  it('normalizes CNY from product fixture', () => {
    const raw: AlibabaRawProduct = {
      ...PRODUCT_FIXTURE,
      currency: 'CNY',
      price_info: { price: '100', currency: 'CNY', unit: 'PCS' },
    };
    const result = mapAlibabaProduct(raw);
    expect(result.currency).toBe('CNY');
  });

  it('normalizes RMB to CNY', () => {
    const raw: AlibabaRawProduct = {
      ...PRODUCT_FIXTURE,
      currency: 'RMB',
      price_info: { price: '100', currency: 'RMB', unit: 'KG' },
    };
    const result = mapAlibabaProduct(raw);
    expect(result.currency).toBe('CNY');
  });

  it('normalizes US$ to USD', () => {
    const raw: AlibabaRawProduct = {
      ...PRODUCT_FIXTURE,
      currency: 'US$',
      price_info: { price: '10', currency: 'US$', unit: 'PCS' },
    };
    const result = mapAlibabaProduct(raw);
    expect(result.currency).toBe('USD');
  });
});
