export enum WalmartOrderStatus {
  CREATED = 'Created',
  ACKNOWLEDGED = 'Acknowledged',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  REFUND = 'Refund',
}

export enum WalmartFulfillmentType {
  WFS = 'WFS',
  SELLER_FULFILLED = 'SELLER_FULFILLED',
}

export enum WalmartListingStatus {
  PUBLISHED = 'PUBLISHED',
  UNPUBLISHED = 'UNPUBLISHED',
  SYSTEM_PROBLEM = 'SYSTEM_PROBLEM',
  IN_PROGRESS = 'IN_PROGRESS',
}

export enum WalmartReturnStatus {
  INITIATED = 'INITIATED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum WalmartShipmentStatus {
  CREATED = 'CREATED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum WalmartReportType {
  ITEM = 'ITEM',
  INVENTORY = 'INVENTORY',
  ORDER = 'ORDER',
  RETURN = 'RETURN',
  CANCEL = 'CANCEL',
  PERFORMANCE = 'PERFORMANCE',
}

export interface IWalmartCredentials {
  clientId: string;
  clientSecret: string;
  consumerId?: string;
  privateKey?: string;
}

export interface IWalmartTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface IWalmartOrder {
  purchaseOrderId: string;
  customerOrderId: string;
  customerEmailId?: string;
  orderDate: string;
  buyerInfo?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  shippingInfo: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  orderLines: IWalmartOrderLine[];
  orderTotal?: {
    currencyAmount: number;
    currencyUnit: string;
  };
}

export interface IWalmartOrderLine {
  lineNumber: string;
  item: {
    productName: string;
    sku: string;
  };
  charges: {
    charge: Array<{
      chargeType: string;
      chargeName: string;
      chargeAmount: {
        currency: string;
        amount: number;
      };
    }>;
  };
  orderLineQuantity: {
    unitOfMeasurement: string;
    amount: number;
  };
  statusDate: string;
  orderLineStatuses: {
    orderLineStatus: Array<{
      status: string;
      statusQuantity: {
        unitOfMeasurement: string;
        amount: number;
      };
    }>;
  };
  fulfillment?: {
    fulfillmentOption: string;
    shipMethod?: string;
  };
}

export interface IWalmartItem {
  sku: string;
  productName: string;
  productType: string;
  price: {
    currency: string;
    amount: number;
  };
  publishedStatus: WalmartListingStatus;
  lifecycleStatus?: string;
  productIdentifiers?: {
    productIdType: string;
    productId: string;
  }[];
  shelf?: string;
}

export interface IWalmartInventory {
  sku: string;
  quantity: {
    unit: string;
    amount: number;
  };
  fulfillmentLagTime?: number;
}

export interface IWalmartShipment {
  orderLineId: string;
  shipDateTime: string;
  carrier?: string;
  methodCode?: string;
  trackingNumber?: string;
  trackingURL?: string;
}

export interface IWalmartReturn {
  returnOrderId: string;
  customerOrderId: string;
  returnOrderDate: string;
  returnOrderLines: Array<{
    lineNumber: string;
    sku: string;
    returnQuantity: number;
    returnReason: string;
    refundAmount: {
      currency: string;
      amount: number;
    };
  }>;
  returnStatus: WalmartReturnStatus;
}

export interface IWalmartPrice {
  sku: string;
  pricing: Array<{
    currentPrice: {
      value: {
        currency: string;
        amount: number;
      };
    };
    currentPriceType: string;
  }>;
}

export interface IWalmartReport {
  requestId: string;
  requestStatus: string;
  reportType: WalmartReportType;
  availableDate?: string;
  url?: string;
}

export interface IWalmartFeed {
  feedId: string;
  feedType: string;
  feedStatus: string;
  submittedDate: string;
  itemsReceived?: number;
  itemsSucceeded?: number;
  itemsFailed?: number;
  itemsProcessing?: number;
}
