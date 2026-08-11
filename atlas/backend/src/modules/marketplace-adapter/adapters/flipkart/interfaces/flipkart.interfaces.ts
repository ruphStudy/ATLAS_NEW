export enum FlipkartOrderStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  READY_TO_DISPATCH = 'READY_TO_DISPATCH',
  PACKED = 'PACKED',
  FORM_FAILED = 'FORM_FAILED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED',
  SHIPPED = 'SHIPPED',
  PICKUP_COMPLETE = 'PICKUP_COMPLETE',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}

export enum FlipkartFulfillmentType {
  FLIPKART = 'FLIPKART',
  SELLER = 'SELLER',
}

export enum FlipkartListingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum FlipkartReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PICKED = 'PICKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum FlipkartShipmentStatus {
  PENDING = 'PENDING',
  PACKED = 'PACKED',
  READY_TO_DISPATCH = 'READY_TO_DISPATCH',
  DISPATCHED = 'DISPATCHED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}

export enum FlipkartReportType {
  ORDER_REPORT = 'ORDER_REPORT',
  LISTING_REPORT = 'LISTING_REPORT',
  RETURN_REPORT = 'RETURN_REPORT',
  INVENTORY_REPORT = 'INVENTORY_REPORT',
  SETTLEMENT_REPORT = 'SETTLEMENT_REPORT',
  PERFORMANCE_REPORT = 'PERFORMANCE_REPORT',
}

export interface IFlipkartCredentials {
  appId: string;
  appSecret: string;
  sellerId: string;
  accessToken?: string;
}

export interface IFlipkartTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface IFlipkartOrder {
  orderId: string;
  orderDate: string;
  status: FlipkartOrderStatus;
  fulfillmentType: FlipkartFulfillmentType;
  shippingAddress?: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  orderItems: IFlipkartOrderItem[];
  totalPrice?: number;
  currency?: string;
}

export interface IFlipkartOrderItem {
  orderItemId: string;
  sku: string;
  fsn: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  hsn?: string;
  cancellable?: boolean;
  returnWindow?: number;
}

export interface IFlipkartListing {
  sku: string;
  fsn?: string;
  listingId: string;
  title: string;
  mrp?: number;
  sellingPrice?: number;
  listingStatus: FlipkartListingStatus;
  fulfillmentType?: FlipkartFulfillmentType;
  procurementSLA?: number;
  localShelfLife?: number;
  quantity?: number;
}

export interface IFlipkartInventory {
  sku: string;
  fsn?: string;
  inventory: number;
  fulfillmentType: FlipkartFulfillmentType;
}

export interface IFlipkartProduct {
  fsn: string;
  productTitle: string;
  productDescription?: string;
  brand?: string;
  vertical?: string;
  category?: string[];
  attributes?: Record<string, any>;
  imageUrls?: string[];
}

export interface IFlipkartShipment {
  shipmentId: string;
  orderId: string;
  status: FlipkartShipmentStatus;
  trackingId?: string;
  courier?: string;
  dispatchByDate?: string;
  dispatchAfterDate?: string;
  items: Array<{
    sku: string;
    quantity: number;
  }>;
}

export interface IFlipkartReturn {
  returnId: string;
  orderId: string;
  orderItemId: string;
  status: FlipkartReturnStatus;
  returnReason?: string;
  returnType?: string;
  returnDate?: string;
  refundAmount?: number;
}

export interface IFlipkartPricing {
  sku: string;
  fsn: string;
  mrp: number;
  sellingPrice: number;
  currency: string;
  specialPrice?: number;
  specialPriceStartDate?: string;
  specialPriceEndDate?: string;
}

export interface IFlipkartReport {
  reportId: string;
  reportType: FlipkartReportType;
  status: string;
  requestedDate: string;
  completedDate?: string;
  downloadUrl?: string;
}

export interface IFlipkartServiceProfile {
  locationId: string;
  fulfillmentType: FlipkartFulfillmentType;
  serviceableArea?: string[];
}
