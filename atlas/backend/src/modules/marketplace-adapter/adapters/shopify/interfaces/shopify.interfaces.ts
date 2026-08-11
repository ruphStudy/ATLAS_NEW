export enum ShopifyOrderStatus {
  OPEN = 'OPEN',
  ARCHIVED = 'ARCHIVED',
  CANCELLED = 'CANCELLED',
}

export enum ShopifyFulfillmentStatus {
  FULFILLED = 'FULFILLED',
  PARTIAL = 'PARTIAL',
  UNFULFILLED = 'UNFULFILLED',
  RESTOCKED = 'RESTOCKED',
  SCHEDULED = 'SCHEDULED',
}

export enum ShopifyFinancialStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  VOIDED = 'VOIDED',
}

export enum ShopifyProductStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT',
}

export enum ShopifyInventoryPolicy {
  DENY = 'DENY',
  CONTINUE = 'CONTINUE',
}

export enum ShopifyWebhookTopic {
  ORDERS_CREATE = 'ORDERS_CREATE',
  ORDERS_UPDATED = 'ORDERS_UPDATED',
  ORDERS_CANCELLED = 'ORDERS_CANCELLED',
  ORDERS_FULFILLED = 'ORDERS_FULFILLED',
  ORDERS_PAID = 'ORDERS_PAID',
  PRODUCTS_CREATE = 'PRODUCTS_CREATE',
  PRODUCTS_UPDATE = 'PRODUCTS_UPDATE',
  PRODUCTS_DELETE = 'PRODUCTS_DELETE',
  INVENTORY_LEVELS_UPDATE = 'INVENTORY_LEVELS_UPDATE',
  FULFILLMENTS_CREATE = 'FULFILLMENTS_CREATE',
  FULFILLMENTS_UPDATE = 'FULFILLMENTS_UPDATE',
  REFUNDS_CREATE = 'REFUNDS_CREATE',
}

export interface IShopifyCredentials {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}

export interface IShopifyShop {
  id: string;
  name: string;
  email: string;
  domain: string;
  currency: string;
  moneyFormat: string;
  timezone: string;
}

export interface IShopifyOrder {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  closedAt?: string;
  processedAt?: string;
  currency: string;
  currentSubtotalPrice: string;
  currentTotalPrice: string;
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  financialStatus: ShopifyFinancialStatus;
  fulfillmentStatus: ShopifyFulfillmentStatus;
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress?: any;
  billingAddress?: any;
  lineItems: IShopifyLineItem[];
  fulfillments?: IShopifyFulfillment[];
}

export interface IShopifyLineItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  sku?: string;
  quantity: number;
  price: string;
  totalDiscount: string;
  fulfillableQuantity: number;
  fulfillmentStatus?: string;
}

export interface IShopifyProduct {
  id: string;
  title: string;
  bodyHtml?: string;
  vendor?: string;
  productType?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: ShopifyProductStatus;
  tags?: string[];
  variants: IShopifyVariant[];
  images?: IShopifyImage[];
  options?: IShopifyProductOption[];
}

export interface IShopifyVariant {
  id: string;
  productId: string;
  title: string;
  sku?: string;
  price: string;
  compareAtPrice?: string;
  position: number;
  inventoryPolicy: ShopifyInventoryPolicy;
  inventoryQuantity?: number;
  inventoryItemId?: string;
  weight?: number;
  weightUnit?: string;
  requiresShipping: boolean;
  barcode?: string;
}

export interface IShopifyImage {
  id: string;
  productId: string;
  position: number;
  src: string;
  width?: number;
  height?: number;
  altText?: string;
}

export interface IShopifyProductOption {
  id: string;
  productId: string;
  name: string;
  position: number;
  values: string[];
}

export interface IShopifyInventoryLevel {
  inventoryItemId: string;
  locationId: string;
  available: number;
}

export interface IShopifyLocation {
  id: string;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  active: boolean;
}

export interface IShopifyFulfillment {
  id: string;
  orderId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  trackingCompany?: string;
  trackingNumber?: string;
  trackingNumbers?: string[];
  trackingUrl?: string;
  trackingUrls?: string[];
  lineItems: IShopifyLineItem[];
}

export interface IShopifyRefund {
  id: string;
  orderId: string;
  createdAt: string;
  note?: string;
  userId?: string;
  refundLineItems: Array<{
    id: string;
    lineItemId: string;
    quantity: number;
    subtotal: string;
    totalTax: string;
  }>;
  transactions: Array<{
    id: string;
    amount: string;
    kind: string;
    status: string;
  }>;
}

export interface IShopifyWebhook {
  id: string;
  address: string;
  topic: ShopifyWebhookTopic;
  createdAt: string;
  updatedAt: string;
  format: string;
}

export interface IShopifyGraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: {
      code?: string;
      cost?: {
        requestedQueryCost: number;
        actualQueryCost: number;
        throttleStatus: {
          maximumAvailable: number;
          currentlyAvailable: number;
          restoreRate: number;
        };
      };
    };
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export interface IShopifyPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}
