// ── Shared test helpers for IndiaMART adapter tests ──────────

import { AdapterCapability, IntegrationStrategy } from '../../adapters/adapter.types';

export const INDIAMART_ADAPTER_CAPABILITIES = [
  AdapterCapability.SEARCH_SUPPLIERS,
  AdapterCapability.SEARCH_PRODUCTS,
  AdapterCapability.GET_SUPPLIER_DETAILS,
  AdapterCapability.GET_PRODUCT_DETAILS,
  AdapterCapability.REQUEST_QUOTATION,
  AdapterCapability.DOWNLOAD_CATALOG,
  AdapterCapability.VALIDATE_SUPPLIER,
  AdapterCapability.VALIDATE_PRODUCT,
  AdapterCapability.HEALTH_CHECK,
  AdapterCapability.TEST_CONNECTION,
];

export const INDIAMART_INTEGRATION_STRATEGIES = [
  IntegrationStrategy.REST_API,
  IntegrationStrategy.EMAIL_RFQ,
  IntegrationStrategy.FILE_IMPORT,
  IntegrationStrategy.FILE_EXPORT,
  IntegrationStrategy.MANUAL_WORKFLOW,
];
