export const SUPPLIER_DISCOVERY_CONSTANTS = {
  QUEUE_NAME: 'supplier-discovery',
  JOB_NAME: 'run-supplier-discovery',
  DEFAULT_COUNTRY: 'IN',
  WORKER_CONCURRENCY: 2,
} as const;

export const SUPPLIER_PROVIDERS = {
  INDIAMART: 'INDIAMART',
  TRADEINDIA: 'TRADEINDIA',
  ALIBABA: 'ALIBABA',
  MANUAL: 'MANUAL',
} as const;

export type SupplierProviderCode =
  (typeof SUPPLIER_PROVIDERS)[keyof typeof SUPPLIER_PROVIDERS];

export const INDIAMART_COUNTRIES = ['IN'] as const;
export const TRADEINDIA_COUNTRIES = ['IN'] as const;
export const ALIBABA_COUNTRIES = ['CN', 'IN', 'US', 'DE', 'TW', 'PK', 'BD', 'VN', 'ID', 'TR'] as const;
