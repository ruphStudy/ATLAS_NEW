export enum EbayOrderStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  INACTIVE = 'INACTIVE',
}

export enum EbayFulfillmentStatus {
  FULFILLED = 'FULFILLED',
  IN_PROGRESS = 'IN_PROGRESS',
  NOT_STARTED = 'NOT_STARTED',
}

export enum EbayListingStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ENDED = 'ENDED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum EbayMarketplaceId {
  EBAY_US = 'EBAY_US',
  EBAY_UK = 'EBAY_GB',
  EBAY_DE = 'EBAY_DE',
  EBAY_CA = 'EBAY_CA',
  EBAY_AU = 'EBAY_AU',
}

export enum EbayReturnStatus {
  RETURN_OPEN = 'RETURN_OPEN',
  RETURN_CLOSED = 'RETURN_CLOSED',
  RETURN_ESCALATED = 'RETURN_ESCALATED',
}

export interface IEbayCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  redirectUri?: string;
}

export interface IEbayTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  refreshToken?: string;
}

export interface IEbayOrder {
  orderId: string;
  orderFulfillmentStatus: EbayFulfillmentStatus;
  creationDate: string;
  pricingSummary: {
    priceSubtotal: {
      value: string;
      currency: string;
    };
    total: {
      value: string;
      currency: string;
    };
  };
  buyer: {
    username: string;
    buyerRegistrationAddress?: {
      fullName: string;
      contactAddress: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        stateOrProvince?: string;
        postalCode?: string;
        countryCode?: string;
      };
    };
  };
  fulfillmentStartInstructions: Array<{
    fulfillmentInstructionsType: string;
    shippingStep: {
      shipTo: {
        fullName: string;
        contactAddress: {
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          stateOrProvince?: string;
          postalCode?: string;
          countryCode?: string;
        };
      };
    };
  }>;
  lineItems: IEbayLineItem[];
}

export interface IEbayLineItem {
  lineItemId: string;
  legacyItemId: string;
  title: string;
  sku?: string;
  quantity: number;
  lineItemCost: {
    value: string;
    currency: string;
  };
  deliveryCost?: {
    shippingCost: {
      value: string;
      currency: string;
    };
  };
  lineItemFulfillmentStatus: EbayFulfillmentStatus;
}

export interface IEbayInventoryItem {
  sku: string;
  product: {
    title: string;
    description?: string;
    imageUrls?: string[];
    aspects?: Record<string, string[]>;
    brand?: string;
    mpn?: string;
    upc?: string[];
    ean?: string[];
    isbn?: string[];
  };
  condition: string;
  availability: {
    shipToLocationAvailability: {
      quantity: number;
    };
  };
}

export interface IEbayOffer {
  offerId: string;
  sku: string;
  marketplaceId: EbayMarketplaceId;
  format: string;
  availableQuantity: number;
  categoryId: string;
  listingDescription: string;
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
  pricingSummary: {
    price: {
      value: string;
      currency: string;
    };
  };
  status: EbayListingStatus;
}

export interface IEbayShipment {
  lineItems: Array<{
    lineItemId: string;
    quantity: number;
  }>;
  shippedDate: string;
  shippingCarrierCode: string;
  trackingNumber: string;
}

export interface IEbayReturn {
  returnId: string;
  orderId: string;
  creationDate: string;
  returnState: EbayReturnStatus;
  buyer: {
    username: string;
  };
  returnQuantity: number;
  returnItem: {
    itemId: string;
    title: string;
  };
  refundAmount: {
    value: string;
    currency: string;
  };
  returnReason?: string;
}

export interface IEbayNotification {
  notificationId: string;
  topic: string;
  eventDate: string;
  status: string;
  deliveryURL?: string;
}

export interface IEbayFulfillmentPolicy {
  fulfillmentPolicyId: string;
  name: string;
  marketplaceId: EbayMarketplaceId;
  categoryTypes: Array<{
    name: string;
  }>;
  handlingTime: {
    value: number;
    unit: string;
  };
  shippingOptions: Array<{
    optionType: string;
    costType: string;
    shippingServices: Array<{
      shippingCarrierCode: string;
      shippingServiceCode: string;
    }>;
  }>;
}

export interface IEbayPaymentPolicy {
  paymentPolicyId: string;
  name: string;
  marketplaceId: EbayMarketplaceId;
  categoryTypes: Array<{
    name: string;
  }>;
  paymentMethods: Array<{
    paymentMethodType: string;
  }>;
}

export interface IEbayReturnPolicy {
  returnPolicyId: string;
  name: string;
  marketplaceId: EbayMarketplaceId;
  categoryTypes: Array<{
    name: string;
  }>;
  returnsAccepted: boolean;
  returnPeriod?: {
    value: number;
    unit: string;
  };
}
