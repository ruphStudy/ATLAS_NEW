import {
  mapIndiaMartSupplier,
  mapIndiaMartProduct,
  mapIndiaMartLeadToQuotation,
  mapIndiaMartSupplierValidation,
  mapIndiaMartProductValidation,
  mapIndiaMartCatalog,
} from '../indiamart/indiamart.mappers';
import { SupplierProviderCode } from '../../../interfaces';
import { IndiaMartRawSupplier, IndiaMartRawProduct, IndiaMartRawLeadResponse, IndiaMartRawCatalog } from '../indiamart/indiamart.types';

// ── Fixtures ──────────────────────────────────────────────────

const SUPPLIER_FIXTURE: IndiaMartRawSupplier = {
  GLID: 'GLID123',
  COMPANY_NAME: 'Test Supplier Pvt Ltd',
  city: 'Mumbai',
  COUNTRY: 'IN',
  phone_number: '+919876543210',
  email_id: 'contact@testsupplier.com',
  website: 'https://testsupplier.com',
  MAIN_PRODUCTS: 'Steel, Aluminum, Copper',
  RATING: '4.5',
  VERIFICATION_STATUS: 'TrustSEAL Verified',
  TRUST_SEAL: 'Yes',
  IS_INDIAMART_MEMBER: 'Yes',
};

const PRODUCT_FIXTURE: IndiaMartRawProduct = {
  PPID: 'PPID456',
  PRODUCT_NAME: 'SS 304 Steel Sheet',
  PRODUCT_DESCRIPTION: 'High-quality stainless steel sheet',
  CATEGORY_NAME: 'Metals & Alloys',
  sub_category: 'Steel Sheets',
  PRICE: '250.50',
  CURRENCY: 'INR',
  UNIT: 'KG',
  MIN_ORDER_QUANTITY: '100',
  SUPPLIER_GLID: 'GLID123',
  BRAND: 'SteelCo',
  IMAGES: [{ IMAGE_URL: 'https://img.indiamart.com/product1.jpg' }],
  ATTRIBUTES: { grade: '304', thickness: '2mm' },
};

const LEAD_FIXTURE: IndiaMartRawLeadResponse = {
  LEAD_ID: 'LEAD789',
  STATUS: 'SENT',
  UNIT_PRICE: '250.00',
  QUANTITY: '200',
  CURRENCY: 'INR',
  LEAD_TIME: '7',
  VALID_TILL: '2026-09-01',
  SUPPLIER_GLID: 'GLID123',
  PRODUCT_PPID: 'PPID456',
  TERMS: 'Net 30',
};

// ── Supplier Mapping Tests ─────────────────────────────────────

describe('mapIndiaMartSupplier', () => {
  it('maps all core fields correctly', () => {
    const result = mapIndiaMartSupplier(SUPPLIER_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.INDIAMART);
    expect(result.providerSupplierId).toBe('GLID123');
    expect(result.name).toBe('Test Supplier Pvt Ltd');
    expect(result.city).toBe('Mumbai');
    expect(result.country).toBe('IN');
    expect(result.contactEmail).toBe('contact@testsupplier.com');
    expect(result.contactPhone).toBe('+919876543210');
    expect(result.website).toBe('https://testsupplier.com');
    expect(result.isVerified).toBe(true);
    expect(result.overallRating).toBe(4.5);
    expect(result.tier).toBe('TRUST_SEAL');
  });

  it('maps categories from MAIN_PRODUCTS when no category array', () => {
    const result = mapIndiaMartSupplier(SUPPLIER_FIXTURE);
    expect(result.categories).toContain('Steel');
    expect(result.categories).toContain('Aluminum');
  });

  it('marks unverified supplier as not verified', () => {
    const raw: IndiaMartRawSupplier = {
      ...SUPPLIER_FIXTURE,
      VERIFICATION_STATUS: '',
      TRUST_SEAL: 'No',
      IS_INDIAMART_MEMBER: 'No',
    };
    const result = mapIndiaMartSupplier(raw);
    expect(result.isVerified).toBe(false);
  });

  it('handles missing optional fields gracefully', () => {
    const raw: IndiaMartRawSupplier = { GLID: 'G1', COMPANY_NAME: 'Minimal Supplier' };
    const result = mapIndiaMartSupplier(raw);
    expect(result.website).toBeNull();
    expect(result.contactEmail).toBeNull();
    expect(result.contactPhone).toBeNull();
    expect(result.overallRating).toBeNull();
    expect(result.categories).toHaveLength(0);
  });

  it('preserves raw data', () => {
    const result = mapIndiaMartSupplier(SUPPLIER_FIXTURE);
    expect(result.rawData).toMatchObject({ GLID: 'GLID123' });
  });
});

// ── Supplier Validation Tests ─────────────────────────────────

describe('mapIndiaMartSupplierValidation', () => {
  it('produces high score for fully verified supplier', () => {
    const result = mapIndiaMartSupplierValidation(SUPPLIER_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.checks.find((c) => c.checkName === 'is_verified')?.passed).toBe(true);
  });

  it('produces failing result for missing required fields', () => {
    const result = mapIndiaMartSupplierValidation({ GLID: '' });
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
    expect(result.checks.find((c) => c.checkName === 'has_glid')?.passed).toBe(false);
  });
});

// ── Product Mapping Tests ─────────────────────────────────────

describe('mapIndiaMartProduct', () => {
  it('maps all core product fields', () => {
    const result = mapIndiaMartProduct(PRODUCT_FIXTURE);
    expect(result.providerCode).toBe(SupplierProviderCode.INDIAMART);
    expect(result.providerProductId).toBe('PPID456');
    expect(result.name).toBe('SS 304 Steel Sheet');
    expect(result.description).toBe('High-quality stainless steel sheet');
    expect(result.category).toBe('Metals & Alloys');
    expect(result.subCategory).toBe('Steel Sheets');
    expect(result.brand).toBe('SteelCo');
    expect(result.unitPrice).toBe(250.5);
    expect(result.currency).toBe('INR');
    expect(result.minOrderQuantity).toBe(100);
    expect(result.supplierProviderSupplierId).toBe('GLID123');
  });

  it('normalizes unit from raw value', () => {
    const result = mapIndiaMartProduct(PRODUCT_FIXTURE);
    expect(result.currency).toBe('INR');
  });

  it('maps images correctly', () => {
    const result = mapIndiaMartProduct(PRODUCT_FIXTURE);
    expect(result.images).toContain('https://img.indiamart.com/product1.jpg');
  });

  it('maps attributes', () => {
    const result = mapIndiaMartProduct(PRODUCT_FIXTURE);
    expect(result.attributes['grade']).toBe('304');
  });

  it('handles missing price and MOQ gracefully', () => {
    const result = mapIndiaMartProduct({ PPID: 'P1', PRODUCT_NAME: 'Item' });
    expect(result.unitPrice).toBeNull();
    expect(result.minOrderQuantity).toBeNull();
  });
});

// ── Product Validation Tests ──────────────────────────────────

describe('mapIndiaMartProductValidation', () => {
  it('passes for fully populated product', () => {
    const result = mapIndiaMartProductValidation(PRODUCT_FIXTURE);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it('fails for empty product', () => {
    const result = mapIndiaMartProductValidation({});
    expect(result.isValid).toBe(false);
    expect(result.score).toBe(0);
  });
});

// ── Quotation Mapping Tests ───────────────────────────────────

describe('mapIndiaMartLeadToQuotation', () => {
  it('maps all quotation fields', () => {
    const result = mapIndiaMartLeadToQuotation(LEAD_FIXTURE, 'GLID123');
    expect(result.providerCode).toBe(SupplierProviderCode.INDIAMART);
    expect(result.providerQuotationId).toBe('LEAD789');
    expect(result.supplierId).toBe('GLID123');
    expect(result.productId).toBe('PPID456');
    expect(result.unitPrice).toBe(250);
    expect(result.quantity).toBe(200);
    expect(result.totalPrice).toBe(50_000);
    expect(result.currency).toBe('INR');
    expect(result.leadTimeDays).toBe(7);
    expect(result.terms).toBe('Net 30');
  });

  it('parses validUntil date', () => {
    const result = mapIndiaMartLeadToQuotation(LEAD_FIXTURE, 'GLID123');
    expect(result.validUntil).toBeInstanceOf(Date);
  });

  it('handles missing optional fields', () => {
    const result = mapIndiaMartLeadToQuotation(
      { LEAD_ID: 'L1', STATUS: 'SENT' },
      'GLID1',
    );
    expect(result.unitPrice).toBe(0);
    expect(result.quantity).toBe(1);
    expect(result.validUntil).toBeNull();
    expect(result.leadTimeDays).toBeNull();
  });
});

// ── Catalog Mapping Tests ─────────────────────────────────────

describe('mapIndiaMartCatalog', () => {
  it('maps all catalog products', () => {
    const catalog: IndiaMartRawCatalog = {
      SUPPLIER_GLID: 'GLID123',
      PRODUCTS: [PRODUCT_FIXTURE, { ...PRODUCT_FIXTURE, PPID: 'P2', PRODUCT_NAME: 'Item 2' }],
      TOTAL_COUNT: 2,
    };
    const result = mapIndiaMartCatalog(catalog);
    expect(result).toHaveLength(2);
    expect(result[0]!.providerProductId).toBe('PPID456');
    expect(result[1]!.providerProductId).toBe('P2');
  });

  it('returns empty array for empty catalog', () => {
    const result = mapIndiaMartCatalog({ SUPPLIER_GLID: 'G1', PRODUCTS: [] });
    expect(result).toHaveLength(0);
  });
});
