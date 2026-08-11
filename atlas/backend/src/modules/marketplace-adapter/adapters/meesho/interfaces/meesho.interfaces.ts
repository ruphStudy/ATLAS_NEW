export enum MeeshoOrderStatus {
  PLACED = 'PLACED',
  APPROVED = 'APPROVED',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

export enum MeeshoProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export enum MeeshoReturnStatus {
  INITIATED = 'INITIATED',
  PICKUP_SCHEDULED = 'PICKUP_SCHEDULED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  REFUNDED = 'REFUNDED',
  REJECTED = 'REJECTED',
}

export enum MeeshoShipmentStatus {
  PENDING = 'PENDING',
  PICKED = 'PICKED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  RTO = 'RTO',
}

export interface IMeeshoCredentials {
  supplierId: string;
  apiKey: string;
  apiSecret: string;
}

export interface IMeeshoOrder {
  orderId: string;
  orderPlacedAt: string;
  orderStatus: MeeshoOrderStatus;
  subOrderId: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  shippingCharge: number;
  totalAmount: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  paymentMode: string;
}

export interface IMeeshoProduct {
  productId: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  status: MeeshoProductStatus;
  images?: string[];
  attributes?: Record<string, any>;
  hsn?: string;
}

export interface IMeeshoInventory {
  sku: string;
  productId: string;
  availableStock: number;
  reservedStock: number;
  totalStock: number;
}

export interface IMeeshoShipment {
  orderId: string;
  subOrderId: string;
  trackingId: string;
  courierName: string;
  shippedDate: string;
  estimatedDelivery?: string;
  status: MeeshoShipmentStatus;
  awbNumber?: string;
}

export interface IMeeshoReturn {
  returnId: string;
  orderId: string;
  subOrderId: string;
  productSku: string;
  quantity: number;
  returnReason: string;
  returnStatus: MeeshoReturnStatus;
  initiatedAt: string;
  refundAmount?: number;
  pickupAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
}

export interface IMeeshoPrice {
  sku: string;
  productId: string;
  mrp: number;
  sellingPrice: number;
  discount?: number;
  effectiveFrom?: string;
}

export interface IMeeshoReport {
  reportId: string;
  reportType: string;
  status: string;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
}

export interface IMeeshoCategory {
  categoryId: string;
  categoryName: string;
  subcategories?: Array<{
    subcategoryId: string;
    subcategoryName: string;
  }>;
}

export interface IMeeshoSupplier {
  supplierId: string;
  supplierName: string;
  email: string;
  phone: string;
  status: string;
  registeredAt: string;
}
