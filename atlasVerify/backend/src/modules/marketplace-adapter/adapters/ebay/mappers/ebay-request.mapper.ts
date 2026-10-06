import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';
import { EBAY_DEFAULT_PAGE_SIZE } from '../constants/ebay.constants';

@Injectable()
export class EbayRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return {
        limit: EBAY_DEFAULT_PAGE_SIZE,
      };
    }

    const mapped: Record<string, any> = {};

    if (params.offset !== undefined) {
      mapped.offset = params.offset;
    }

    if (params.limit) {
      mapped.limit = Math.min(params.limit, 200);
    } else {
      mapped.limit = EBAY_DEFAULT_PAGE_SIZE;
    }

    return mapped;
  }

  mapOrderFilters(filters?: {
    startDate?: Date;
    endDate?: Date;
    statuses?: string[];
  }): string | undefined {
    if (!filters) {
      return undefined;
    }

    const filterParts: string[] = [];

    if (filters.startDate) {
      filterParts.push(`creationdate:[${filters.startDate.toISOString()}..`);
    }

    if (filters.endDate) {
      filterParts.push(`creationdate:[..${filters.endDate.toISOString()}]`);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      const statusFilter = filters.statuses
        .map((s) => `orderFulfillmentStatus:{${s}}`)
        .join(' OR ');
      filterParts.push(`(${statusFilter})`);
    }

    return filterParts.length > 0 ? filterParts.join(' AND ') : undefined;
  }

  mapInventoryItem(data: any): any {
    const mapped: any = {
      product: {
        title: data.title || data.productName,
      },
      condition: data.condition || 'NEW',
      availability: {
        shipToLocationAvailability: {
          quantity: data.quantity || 0,
        },
      },
    };

    if (data.description) {
      mapped.product.description = data.description;
    }

    if (data.imageUrls) {
      mapped.product.imageUrls = Array.isArray(data.imageUrls)
        ? data.imageUrls
        : [data.imageUrls];
    }

    if (data.brand) {
      mapped.product.brand = data.brand;
    }

    if (data.mpn) {
      mapped.product.mpn = data.mpn;
    }

    if (data.upc) {
      mapped.product.upc = Array.isArray(data.upc) ? data.upc : [data.upc];
    }

    if (data.ean) {
      mapped.product.ean = Array.isArray(data.ean) ? data.ean : [data.ean];
    }

    return mapped;
  }

  mapOffer(data: any): any {
    const mapped: any = {
      sku: data.sku,
      marketplaceId: data.marketplaceId || 'EBAY_US',
      format: data.format || 'FIXED_PRICE',
      availableQuantity: data.quantity || data.availableQuantity || 0,
      categoryId: data.categoryId,
      listingDescription: data.description || data.listingDescription,
      pricingSummary: {
        price: {
          value: String(data.price),
          currency: data.currency || 'USD',
        },
      },
    };

    if (data.listingPolicies) {
      mapped.listingPolicies = data.listingPolicies;
    }

    if (data.fulfillmentPolicyId && data.paymentPolicyId && data.returnPolicyId) {
      mapped.listingPolicies = {
        fulfillmentPolicyId: data.fulfillmentPolicyId,
        paymentPolicyId: data.paymentPolicyId,
        returnPolicyId: data.returnPolicyId,
      };
    }

    return mapped;
  }

  mapInventoryUpdate(data: any): any {
    return {
      availability: {
        shipToLocationAvailability: {
          quantity: data.quantity,
        },
      },
    };
  }

  mapShipmentData(data: any): any {
    return {
      lineItems: data.lineItems?.map((item: any) => ({
        lineItemId: item.lineItemId,
        quantity: item.quantity || 1,
      })),
      shippedDate: data.shipDate || new Date().toISOString(),
      shippingCarrierCode: data.carrier || 'USPS',
      trackingNumber: data.trackingNumber,
    };
  }

  mapPriceUpdate(data: any): any {
    return {
      pricingSummary: {
        price: {
          value: String(data.price),
          currency: data.currency || 'USD',
        },
      },
    };
  }
}
