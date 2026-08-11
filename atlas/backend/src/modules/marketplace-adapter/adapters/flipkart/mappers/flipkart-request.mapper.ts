import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';

@Injectable()
export class FlipkartRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return {};
    }

    const mapped: Record<string, any> = {};

    if (params.offset !== undefined) {
      mapped.offset = params.offset;
    }

    if (params.limit) {
      mapped.limit = Math.min(params.limit, 100);
    }

    return mapped;
  }

  mapOrderFilters(filters?: {
    startDate?: Date;
    endDate?: Date;
    statuses?: string[];
  }): any {
    if (!filters) {
      return { filter: {} };
    }

    const filterObj: any = {};

    if (filters.startDate) {
      filterObj.orderDate = filterObj.orderDate || {};
      filterObj.orderDate.fromDate = filters.startDate.toISOString();
    }

    if (filters.endDate) {
      filterObj.orderDate = filterObj.orderDate || {};
      filterObj.orderDate.toDate = filters.endDate.toISOString();
    }

    if (filters.statuses && filters.statuses.length > 0) {
      filterObj.states = filters.statuses;
    }

    return { filter: filterObj };
  }

  mapListingData(data: any): any {
    const mapped: any = {
      sku: data.sku,
      listingStatus: data.status || 'ACTIVE',
    };

    if (data.fsn) {
      mapped.fsn = data.fsn;
    }

    if (data.mrp !== undefined) {
      mapped.mrp = data.mrp;
    }

    if (data.sellingPrice !== undefined) {
      mapped.sellingPrice = data.sellingPrice;
    }

    if (data.quantity !== undefined) {
      mapped.inventory = data.quantity;
    }

    if (data.fulfillmentType) {
      mapped.fulfillmentType = data.fulfillmentType;
    }

    if (data.procurementSLA) {
      mapped.procurementSLA = data.procurementSLA;
    }

    if (data.attributes) {
      mapped.attributes = data.attributes;
    }

    return mapped;
  }

  mapInventoryUpdate(data: any): any {
    return {
      sku: data.sku,
      inventory: data.quantity,
      fulfillmentType: data.fulfillmentType || 'SELLER',
    };
  }

  mapShipmentData(data: any): any {
    return {
      orderItemIds: data.orderItemIds || [],
      locationId: data.locationId,
      trackingId: data.trackingNumber,
      courierName: data.carrier,
    };
  }

  mapPricingUpdate(data: any): any {
    const mapped: any = {
      sku: data.sku,
      mrp: data.mrp,
      sellingPrice: data.sellingPrice,
    };

    if (data.specialPrice !== undefined) {
      mapped.specialPrice = data.specialPrice;
      if (data.specialPriceStartDate) {
        mapped.specialPriceStartDate = data.specialPriceStartDate;
      }
      if (data.specialPriceEndDate) {
        mapped.specialPriceEndDate = data.specialPriceEndDate;
      }
    }

    return mapped;
  }

  mapReturnAction(action: string, data?: any): any {
    return {
      action,
      comments: data?.comments,
      refundAmount: data?.refundAmount,
    };
  }
}
