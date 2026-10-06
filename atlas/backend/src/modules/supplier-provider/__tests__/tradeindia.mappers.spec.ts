import {
  mapTradeIndiaSupplier,
  mapTradeIndiaSupplierValidation,
  mapTradeIndiaProduct,
  mapTradeIndiaProductValidation,
  mapTradeIndiaRfqToQuotation,
  mapTradeIndiaCatalog,
} from '../adapters/providers/tradeindia/tradeindia.mappers';
import { SupplierProviderCode } from '../interfaces';
import {
  TradeIndiaRawSupplier,
  TradeIndiaRawProduct,
  TradeIndiaRawRfqResponse,
  TradeIndiaRawCatalog,
} from '../adapters/providers/tradeindia/tradeindia.types';

// ── Fixtures ──────────────────────────────────────────────────

const SUPPLIER_FIXTURE: TradeIndiaRawSupplier = {
  SELLER_ID: 'TI_SELLER_001',
  COMPANY_NAME: 'Rajesh Metal Works Pvt Ltd',
  CITY: 'Delhi',
  STATE: 'Delhi',
  COUNTRY: 'IN',
  EMAIL: 'info@rajeshmetals.com',
  PHONE: '+91-11-12345678',
  WEBSITE: 'https://rajeshmetals.tradeindia.com',
  MAIN_PRODUCTS: 'Steel Rods, Iron Pipes, Copper Sheets',
  BUSINESS_TYPE: 'Manufacturer',
  IS_VERIFIED: true,
  IS_PREMIUM: true,
  IS_TRUSTED: false,
  MEMBERSHIP_TYPE: 'premium',
  RATING: '4.2',
};

const PRODUCT_FIXTURE: TradeIndiaRawProduct = {
  PRODUCT_ID: 'TI_PROD_001',
  PRODUCT_NAME: 'MS Round Bar',
  DESCRIPTION: 'Mild Steel Round Bar, IS 2062 Grade',
  CATEGORY: 'Steel Bars',
  SUB_CATEGORY: 'Mild Steel',
  PRICE: '75.50',
  CURRENCY: 'INR',
  UNIT: 'KG',
  MOQ: '100',
  IMAGES: [
    { IMAGE_URL: 'https://img.tradeindia.com/product1.jpg' },
    { URL: 'https://img.tradeindia.com/product2.jpg' },
  ],
  ATTRIBUTES: { grade: 'E250', finish: 'Hot Rolled' },
  SPECIFICATIONS: { standard: 'IS 2062', diameter: '12mm' },
  SELLER_ID: 'TI_SELLER_001',
  BRAND: 'Rajesh',
};

const RFQ_FIXTURE: TradeIndiaRawRfqResponse = {
  RFQ_ID: 'RFQ_TI_001',
  STATUS: 'SENT',
  UNIT_PRICE: '73.00',
  QUANTITY: 500,
  CURRENCY: 'INR',
  LEAD_TIME: '10',
  VALID_UNTIL: '2026-10-15',
  PAYMENT_TERMS: 'Advance',
  DELIVERY_TERMS: 'Ex-Works',
  SELLER_ID: 'TI_SELLER_001',
  PRODUCT_ID: 'TI_PROD_001',
};

// ── Supplier Mapping ──────────────────────────────────────────

describe('mapTradeIndiaSupplier', () => {
  it('maps all core fields (uppercase keys)', () => {
    const result = mapTradeIndiaSupplier(SUPPLIER_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.TRADEINDIA);
    expect(result.providerSupplierId).toBe('TI_SELLER_001');
    expect(result.name).toBe('Rajesh Metal Works Pvt Ltd');
    expect(result.city).toBe('Delhi');
    expect(result.country).toBe('IN');
    expect(result.contactEmail).toBe('info@rajeshmetals.com');
    expect(result.contactPhone).toBe('+91-11-12345678');
    expect(result.website).toBe('https://rajeshmetals.tradeindia.com');
    expect(result.isVerified).toBe(true);
    expect(result.tier).toBe('PREMIUM');
    expect(result.overallRating).toBe(4.2);
  });

  it('maps fields from lowercase keys when uppercase absent', () => {
    const raw: TradeIndiaRawSupplier = {
      seller_id: 'S2',
      company_name: 'Lowercase Co',
      city: 'Mumbai',
      is_verified: true,
    };
    const result = mapTradeIndiaSupplier(raw);
    expect(result.providerSupplierId).toBe('S2');
    expect(result.name).toBe('Lowercase Co');
    expect(result.city).toBe('Mumbai');
    expect(result.isVerified).toBe(true);
  });

  it('maps categories from MAIN_PRODUCTS', () => {
    const result = mapTradeIndiaSupplier(SUPPLIER_FIXTURE);
    expect(result.categories).toContain('Steel Rods');
    expect(result.categories).toContain('Iron Pipes');
  });

  it('marks unverified when all flags absent', () => {
    const raw: TradeIndiaRawSupplier = { SELLER_ID: 'S3', COMPANY_NAME: 'Basic Co' };
    expect(mapTradeIndiaSupplier(raw).isVerified).toBe(false);
    expect(mapTradeIndiaSupplier(raw).tier).toBeNull();
  });

  it('handles string booleans "yes" and "1"', () => {
    const raw: TradeIndiaRawSupplier = {
      SELLER_ID: 'S4',
      COMPANY_NAME: 'String Bool Co',
      IS_VERIFIED: 'yes',
      IS_PREMIUM: '1',
    };
    const result = mapTradeIndiaSupplier(raw);
    expect(result.isVerified).toBe(true);
    expect(result.tier).toBe('PREMIUM');
  });

  it('preserves rawData', () => {
    const result = mapTradeIndiaSupplier(SUPPLIER_FIXTURE);
    expect(result.rawData).toMatchObject({ SELLER_ID: 'TI_SELLER_001' });
  });
});

// ── Supplier Validation ───────────────────────────────────────

describe('mapTradeIndiaSupplierValidation', () => {
  it('produces high score for fully verified supplier', () => {
    const result = mapTradeIndiaSupplierValidation(SUPPLIER_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('fails for empty supplier', () => {
    const result = mapTradeIndiaSupplierValidation({});
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
  });

  it('includes expected check names', () => {
    const result = mapTradeIndiaSupplierValidation(SUPPLIER_FIXTURE);
    const names = result.checks.map((c) => c.checkName);
    expect(names).toContain('has_seller_id');
    expect(names).toContain('is_verified');
    expect(names).toContain('is_premium_member');
  });
});

// ── Product Mapping ───────────────────────────────────────────

describe('mapTradeIndiaProduct', () => {
  it('maps all core fields (uppercase keys)', () => {
    const result = mapTradeIndiaProduct(PRODUCT_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.TRADEINDIA);
    expect(result.providerProductId).toBe('TI_PROD_001');
    expect(result.name).toBe('MS Round Bar');
    expect(result.description).toBe('Mild Steel Round Bar, IS 2062 Grade');
    expect(result.category).toBe('Steel Bars');
    expect(result.subCategory).toBe('Mild Steel');
    expect(result.brand).toBe('Rajesh');
    expect(result.unitPrice).toBe(75.5);
    expect(result.currency).toBe('INR');
    expect(result.minOrderQuantity).toBe(100);
    expect(result.supplierProviderSupplierId).toBe('TI_SELLER_001');
  });

  it('maps images from IMAGE_URL and URL', () => {
    const result = mapTradeIndiaProduct(PRODUCT_FIXTURE);
    expect(result.images).toContain('https://img.tradeindia.com/product1.jpg');
    expect(result.images).toContain('https://img.tradeindia.com/product2.jpg');
  });

  it('merges ATTRIBUTES and SPECIFICATIONS into attributes', () => {
    const result = mapTradeIndiaProduct(PRODUCT_FIXTURE);
    expect(result.attributes['grade']).toBe('E250');
    expect(result.attributes['standard']).toBe('IS 2062');
  });

  it('maps from lowercase keys when uppercase absent', () => {
    const raw: TradeIndiaRawProduct = {
      product_id: 'P1',
      product_name: 'Copper Wire',
      price: '200',
      currency: 'INR',
      unit: 'KG',
      moq: '50',
    };
    const result = mapTradeIndiaProduct(raw);
    expect(result.name).toBe('Copper Wire');
    expect(result.unitPrice).toBe(200);
    expect(result.minOrderQuantity).toBe(50);
  });

  it('handles missing price / MOQ gracefully', () => {
    const result = mapTradeIndiaProduct({ PRODUCT_ID: 'P2', PRODUCT_NAME: 'Item' });
    expect(result.unitPrice).toBeNull();
    expect(result.minOrderQuantity).toBeNull();
  });
});

// ── Product Validation ────────────────────────────────────────

describe('mapTradeIndiaProductValidation', () => {
  it('passes for complete product', () => {
    const result = mapTradeIndiaProductValidation(PRODUCT_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('fails for empty product', () => {
    expect(mapTradeIndiaProductValidation({}).isValid).toBe(false);
  });
});

// ── RFQ / Quotation Mapping ───────────────────────────────────

describe('mapTradeIndiaRfqToQuotation', () => {
  it('maps all fields correctly', () => {
    const result = mapTradeIndiaRfqToQuotation(RFQ_FIXTURE, 'TI_SELLER_001');
    expect(result.providerCode).toBe(SupplierProviderCode.TRADEINDIA);
    expect(result.providerQuotationId).toBe('RFQ_TI_001');
    expect(result.supplierId).toBe('TI_SELLER_001');
    expect(result.productId).toBe('TI_PROD_001');
    expect(result.unitPrice).toBe(73);
    expect(result.quantity).toBe(500);
    expect(result.totalPrice).toBe(36_500);
    expect(result.currency).toBe('INR');
    expect(result.leadTimeDays).toBe(10);
  });

  it('parses validUntil date', () => {
    const result = mapTradeIndiaRfqToQuotation(RFQ_FIXTURE, 'S1');
    expect(result.validUntil).toBeInstanceOf(Date);
  });

  it('builds combined terms string', () => {
    const result = mapTradeIndiaRfqToQuotation(RFQ_FIXTURE, 'S1');
    expect(result.terms).toContain('Advance');
    expect(result.terms).toContain('Ex-Works');
  });

  it('uses lowercase keys when uppercase absent', () => {
    const raw: TradeIndiaRawRfqResponse = {
      rfq_id: 'R1',
      unit_price: '50',
      quantity: 10,
      currency: 'INR',
    };
    const result = mapTradeIndiaRfqToQuotation(raw, 'S1');
    expect(result.providerQuotationId).toBe('R1');
    expect(result.unitPrice).toBe(50);
  });

  it('handles missing optional fields', () => {
    const result = mapTradeIndiaRfqToQuotation({}, 'S1');
    expect(result.unitPrice).toBe(0);
    expect(result.quantity).toBe(1);
    expect(result.validUntil).toBeNull();
    expect(result.leadTimeDays).toBeNull();
    expect(result.terms).toBeNull();
  });
});

// ── Catalog Mapping ───────────────────────────────────────────

describe('mapTradeIndiaCatalog', () => {
  it('maps all products in catalog from PRODUCTS', () => {
    const catalog: TradeIndiaRawCatalog = {
      SELLER_ID: 'TI_SELLER_001',
      PRODUCTS: [
        PRODUCT_FIXTURE,
        { ...PRODUCT_FIXTURE, PRODUCT_ID: 'P2', PRODUCT_NAME: 'Aluminum Rod' },
      ],
    };
    const result = mapTradeIndiaCatalog(catalog);
    expect(result).toHaveLength(2);
    expect(result[0]!.providerProductId).toBe('TI_PROD_001');
    expect(result[1]!.name).toBe('Aluminum Rod');
  });

  it('maps products from lowercase products key', () => {
    const catalog: TradeIndiaRawCatalog = {
      seller_id: 'S1',
      products: [{ PRODUCT_ID: 'P3', PRODUCT_NAME: 'Iron Rod' }],
    };
    const result = mapTradeIndiaCatalog(catalog);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Iron Rod');
  });

  it('returns empty for empty catalog', () => {
    expect(mapTradeIndiaCatalog({ PRODUCTS: [] })).toHaveLength(0);
  });
});
