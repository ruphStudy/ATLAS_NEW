import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';

@Injectable()
export class ShopifyRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return { first: 50 };
    }

    const mapped: Record<string, any> = {};

    if (params.cursor) {
      mapped.after = params.cursor;
    }

    if (params.limit) {
      mapped.first = Math.min(params.limit, 250);
    } else {
      mapped.first = 50;
    }

    return mapped;
  }

  mapOrderQuery(filters?: {
    startDate?: Date;
    endDate?: Date;
    statuses?: string[];
  }): string | undefined {
    if (!filters) {
      return undefined;
    }

    const queryParts: string[] = [];

    if (filters.startDate) {
      queryParts.push(`created_at:>='${filters.startDate.toISOString()}'`);
    }

    if (filters.endDate) {
      queryParts.push(`created_at:<='${filters.endDate.toISOString()}'`);
    }

    if (filters.statuses && filters.statuses.length > 0) {
      const statusQuery = filters.statuses
        .map((status) => `status:${status}`)
        .join(' OR ');
      queryParts.push(`(${statusQuery})`);
    }

    return queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
  }

  mapProductInput(data: any): any {
    const input: any = {};

    if (data.id) {
      input.id = data.id;
    }

    if (data.title) {
      input.title = data.title;
    }

    if (data.description) {
      input.descriptionHtml = data.description;
    }

    if (data.vendor) {
      input.vendor = data.vendor;
    }

    if (data.productType) {
      input.productType = data.productType;
    }

    if (data.status) {
      input.status = data.status;
    }

    if (data.tags) {
      input.tags = data.tags;
    }

    if (data.variants) {
      input.variants = data.variants.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price?.toString(),
        compareAtPrice: variant.compareAtPrice?.toString(),
        inventoryPolicy: variant.inventoryPolicy || 'DENY',
        requiresShipping: variant.requiresShipping !== false,
        weight: variant.weight,
        weightUnit: variant.weightUnit || 'KILOGRAMS',
        barcode: variant.barcode,
      }));
    }

    return input;
  }

  mapInventoryUpdate(data: any): any {
    return {
      reason: 'correction',
      setQuantities: [
        {
          inventoryItemId: data.inventoryItemId,
          locationId: data.locationId,
          quantity: data.quantity,
        },
      ],
    };
  }

  mapFulfillmentInput(data: any): any {
    return {
      lineItemsByFulfillmentOrder: [
        {
          fulfillmentOrderId: data.fulfillmentOrderId,
          fulfillmentOrderLineItems: data.lineItems?.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        },
      ],
      notifyCustomer: data.notifyCustomer !== false,
      trackingInfo: data.trackingNumber
        ? {
            company: data.carrier,
            number: data.trackingNumber,
            url: data.trackingUrl,
          }
        : undefined,
    };
  }

  mapWebhookInput(data: { url: string; events: string[] }): any {
    return {
      callbackUrl: data.url,
      format: 'JSON',
    };
  }
}
