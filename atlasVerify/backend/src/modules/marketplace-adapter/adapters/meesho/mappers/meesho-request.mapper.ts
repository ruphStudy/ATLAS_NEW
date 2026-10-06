import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';
import { MEESHO_DEFAULT_PAGE_SIZE } from '../constants/meesho.constants';

@Injectable()
export class MeeshoRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return {
        limit: MEESHO_DEFAULT_PAGE_SIZE,
        offset: 0,
      };
    }

    const mapped: Record<string, any> = {};

    if (params.offset !== undefined) {
      mapped.offset = params.offset;
    } else {
      mapped.offset = 0;
    }

    if (params.limit) {
      mapped.limit = Math.min(params.limit, 100);
    } else {
      mapped.limit = MEESHO_DEFAULT_PAGE_SIZE;
    }

    return mapped;
  }

  mapOrderFilters(filters?: {
    startDate?: Date;
    endDate?: Date;
    statuses?: string[];
  }): Record<string, any> {
    if (!filters) {
      return {};
    }

    const mapped: Record<string, any> = {};

    if (filters.startDate) {
      mapped.startDate = filters.startDate.toISOString();
    }

    if (filters.endDate) {
      mapped.endDate = filters.endDate.toISOString();
    }

    if (filters.statuses && filters.statuses.length > 0) {
      mapped.status = filters.statuses.join(',');
    }

    return mapped;
  }

  mapProductData(data: any): any {
    const mapped: any = {
      name: data.title || data.name,
      sku: data.sku,
      category: data.category,
      mrp: data.mrp || data.price,
      sellingPrice: data.sellingPrice || data.price,
      stock: data.quantity || data.stock || 0,
    };

    if (data.description) {
      mapped.description = data.description;
    }

    if (data.brand) {
      mapped.brand = data.brand;
    }

    if (data.subcategory) {
      mapped.subcategory = data.subcategory;
    }

    if (data.images) {
      mapped.images = Array.isArray(data.images) ? data.images : [data.images];
    }

    if (data.attributes) {
      mapped.attributes = data.attributes;
    }

    if (data.hsn) {
      mapped.hsn = data.hsn;
    }

    return mapped;
  }

  mapInventoryUpdate(data: any): any {
    return {
      sku: data.sku,
      stock: data.quantity || data.stock,
    };
  }

  mapShipmentData(data: any): any {
    return {
      orderId: data.orderId,
      subOrderId: data.subOrderId,
      courierName: data.carrier || data.courierName,
      trackingId: data.trackingNumber || data.trackingId,
      awbNumber: data.awbNumber,
      shippedDate: data.shipDate || new Date().toISOString(),
    };
  }

  mapPriceUpdate(data: any): any {
    return {
      sku: data.sku,
      mrp: data.mrp,
      sellingPrice: data.price || data.sellingPrice,
      effectiveFrom: data.effectiveFrom || new Date().toISOString(),
    };
  }

  mapReturnUpdate(data: any): any {
    return {
      returnId: data.returnId,
      status: data.status,
      resolution: data.resolution,
      refundAmount: data.refundAmount,
    };
  }
}
