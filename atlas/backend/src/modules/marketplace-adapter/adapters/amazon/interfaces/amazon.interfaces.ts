export enum AmazonMarketplace {
  US = 'ATVPDKIKX0DER',
  CA = 'A2EUQ1WTGCTBG2',
  MX = 'A1AM78C64UM0Y8',
  BR = 'A2Q3Y263D00KWC',
  UK = 'A1F83G8C2ARO7P',
  DE = 'A1PA6795UKMFR9',
  FR = 'A13V1IB3VIYZZH',
  IT = 'APJ6JRA9NG5V4',
  ES = 'A1RKKUPIHCS9HS',
  NL = 'A1805IZSGTT6HS',
  SE = 'A2NODRKZP88ZB9',
  PL = 'A1C3SOZRARQ6R3',
  TR = 'A33AVAJ2PDY3EV',
  AE = 'A2VIGQ35RCS4UG',
  IN = 'A21TJRUUN4KGV',
  SG = 'A19VAU5U5O7RUS',
  AU = 'A39IBJ37TRP1C6',
  JP = 'A1VC38T7YXB528',
}

export enum AmazonRegion {
  NA = 'NA',
  EU = 'EU',
  FE = 'FE',
}

export enum AmazonOrderStatus {
  PENDING = 'Pending',
  UNSHIPPED = 'Unshipped',
  PARTIALLY_SHIPPED = 'PartiallyShipped',
  SHIPPED = 'Shipped',
  CANCELED = 'Canceled',
  UNFULFILLABLE = 'Unfulfillable',
  INVOICE_UNCONFIRMED = 'InvoiceUnconfirmed',
  PENDING_AVAILABILITY = 'PendingAvailability',
}

export enum AmazonFulfillmentChannel {
  MFN = 'MFN',
  AFN = 'AFN',
}

export enum AmazonListingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INCOMPLETE = 'INCOMPLETE',
}

export enum AmazonReturnStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  CLOSED = 'Closed',
}

export enum AmazonShipmentStatus {
  WORKING = 'Working',
  SHIPPED = 'Shipped',
  RECEIVING = 'Receiving',
  CANCELLED = 'Cancelled',
  DELETED = 'Deleted',
  CLOSED = 'Closed',
  ERROR = 'Error',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CHECKED_IN = 'CHECKED_IN',
  RECEIVING_COMPLETE = 'RECEIVING',
}

export enum AmazonReportType {
  INVENTORY = '_GET_FLAT_FILE_OPEN_LISTINGS_DATA_',
  ACTIVE_LISTINGS = '_GET_MERCHANT_LISTINGS_DATA_',
  ORDERS = '_GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_',
  SALES_TRAFFIC = '_GET_SALES_AND_TRAFFIC_REPORT_',
  FBA_INVENTORY = '_GET_AFN_INVENTORY_DATA_',
  RETURNS = '_GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE_',
  SETTLEMENT = '_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_',
}

export enum AmazonNotificationType {
  ANY_OFFER_CHANGED = 'ANY_OFFER_CHANGED',
  FEED_PROCESSING_FINISHED = 'FEED_PROCESSING_FINISHED',
  FBA_OUTBOUND_SHIPMENT_STATUS = 'FBA_OUTBOUND_SHIPMENT_STATUS',
  FEE_PROMOTION = 'FEE_PROMOTION',
  FULFILLMENT_ORDER_STATUS = 'FULFILLMENT_ORDER_STATUS',
  REPORT_PROCESSING_FINISHED = 'REPORT_PROCESSING_FINISHED',
  BRANDED_ITEM_CONTENT_CHANGE = 'BRANDED_ITEM_CONTENT_CHANGE',
  ITEM_PRODUCT_TYPE_CHANGE = 'ITEM_PRODUCT_TYPE_CHANGE',
  LISTINGS_ITEM_STATUS_CHANGE = 'LISTINGS_ITEM_STATUS_CHANGE',
  LISTINGS_ITEM_ISSUES_CHANGE = 'LISTINGS_ITEM_ISSUES_CHANGE',
  PRODUCT_TYPE_DEFINITIONS_CHANGE = 'PRODUCT_TYPE_DEFINITIONS_CHANGE',
  ORDER_CHANGE = 'ORDER_CHANGE',
  PRICING_HEALTH = 'PRICING_HEALTH',
  ACCOUNT_STATUS_CHANGED = 'ACCOUNT_STATUS_CHANGED',
}

export interface IAmazonCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  sellerId: string;
  marketplace: AmazonMarketplace;
  region: AmazonRegion;
}

export interface IAmazonTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface IAmazonRateLimit {
  rate: number;
  burst: number;
}

export interface IAmazonOrder {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: AmazonOrderStatus;
  FulfillmentChannel: AmazonFulfillmentChannel;
  SalesChannel?: string;
  OrderTotal?: {
    CurrencyCode: string;
    Amount: string;
  };
  NumberOfItemsShipped?: number;
  NumberOfItemsUnshipped?: number;
  PaymentMethod?: string;
  MarketplaceId: string;
  ShipmentServiceLevelCategory?: string;
  OrderType?: string;
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  IsBusinessOrder?: boolean;
  IsPrime?: boolean;
  IsGlobalExpressEnabled?: boolean;
  IsPremiumOrder?: boolean;
  IsSoldByAB?: boolean;
  IsIBA?: boolean;
  ShippingAddress?: any;
  BuyerInfo?: any;
  OrderItems?: IAmazonOrderItem[];
}

export interface IAmazonOrderItem {
  ASIN: string;
  SellerSKU: string;
  OrderItemId: string;
  Title?: string;
  QuantityOrdered: number;
  QuantityShipped?: number;
  ItemPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  ItemTax?: {
    CurrencyCode: string;
    Amount: string;
  };
  PromotionDiscount?: {
    CurrencyCode: string;
    Amount: string;
  };
  ConditionId?: string;
  ConditionSubtypeId?: string;
  IsGift?: boolean;
  IsTransparency?: boolean;
}

export interface IAmazonListing {
  sku: string;
  asin?: string;
  itemName?: string;
  itemDescription?: string;
  listingId?: string;
  sellerSku?: string;
  price?: {
    amount: number;
    currencyCode: string;
  };
  quantity?: number;
  status?: AmazonListingStatus;
  fulfillmentChannel?: AmazonFulfillmentChannel;
  productType?: string;
  condition?: string;
  marketplace?: string;
}

export interface IAmazonInventoryItem {
  sellerSku: string;
  asin: string;
  condition?: string;
  totalQuantity?: number;
  fulfillableQuantity?: number;
  inboundWorkingQuantity?: number;
  inboundShippedQuantity?: number;
  inboundReceivingQuantity?: number;
  reservedQuantity?: number;
  unfulfillableQuantity?: number;
  lastUpdatedTime?: string;
}

/**
 * Catalog Items v2022-04-01 `searchCatalogItems` supports two mutually
 * exclusive search modes: free-text `keywords`, or `identifiers` (with
 * `identifiersType`, e.g. ASIN/UPC/EAN/GTIN/ISBN/JAN/MINSKU/SKU). ATLAS
 * Discovery's production flow only ever sets `keywords`; `identifiers` is
 * used by sandbox verification, since Amazon's static sandbox only
 * pattern-matches a small fixed set of pre-registered identifier-based
 * requests and does not support arbitrary keyword text.
 */
export interface IAmazonCatalogSearchParams {
  keywords?: string[];
  identifiers?: string[];
  identifiersType?: string;
}

export interface IAmazonCatalogItem {
  asin: string;
  identifiers?: any[];
  images?: any[];
  productTypes?: any[];
  salesRanks?: any[];
  summaries?: any[];
  attributes?: Record<string, any>;
}

export interface IAmazonShipment {
  shipmentId: string;
  amazonOrderId?: string;
  shipmentStatus?: AmazonShipmentStatus;
  carrier?: string;
  trackingNumber?: string;
  shipDate?: string;
  estimatedArrivalDate?: string;
  items?: any[];
}

export interface IAmazonReturn {
  returnId: string;
  amazonOrderId: string;
  sellerReturnReasonCode?: string;
  returnStatus?: AmazonReturnStatus;
  returnDate?: string;
  items?: any[];
}

export interface IAmazonReport {
  reportId: string;
  reportType: string;
  dataStartTime?: string;
  dataEndTime?: string;
  reportScheduleId?: string;
  createdTime: string;
  processingStatus: string;
  processingStartTime?: string;
  processingEndTime?: string;
  reportDocumentId?: string;
}

export interface IAmazonFeed {
  feedId: string;
  feedType: string;
  submittedDate: string;
  processingStatus: string;
  processingStartDate?: string;
  processingEndDate?: string;
  resultFeedDocumentId?: string;
}

export interface IAmazonNotification {
  notificationVersion: string;
  notificationType: AmazonNotificationType;
  payloadVersion: string;
  eventTime: string;
  payload: any;
  notificationMetadata: {
    applicationId: string;
    subscriptionId: string;
    publishTime: string;
    notificationId: string;
  };
}

export interface IAmazonPricing {
  sku: string;
  asin: string;
  listingPrice?: {
    amount: number;
    currencyCode: string;
  };
  shipping?: {
    amount: number;
    currencyCode: string;
  };
  landedPrice?: {
    amount: number;
    currencyCode: string;
  };
  competitivePrices?: any[];
  lowestPrices?: any[];
}
