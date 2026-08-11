import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';

@Injectable()
export class WalmartRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return {};
    }

    const mapped: Record<string, any> = {};

    if (params.offset !== undefined) {
      mapped.offset = params.offset;
    }

    if (params.limit) {
      mapped.limit = Math.min(params.limit, 200);
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
      mapped.createdStartDate = filters.startDate.toISOString();
    }

    if (filters.endDate) {
      mapped.createdEndDate = filters.endDate.toISOString();
    }

    if (filters.statuses && filters.statuses.length > 0) {
      mapped.status = filters.statuses.join(',');
    }

    return mapped;
  }

  mapItemData(data: any): any {
    const mapped: any = {
      sku: data.sku,
      productName: data.title || data.productName,
      productType: data.productType || 'Electronics',
    };

    if (data.price !== undefined) {
      mapped.price = {
        currency: data.currency || 'USD',
        amount: data.price,
      };
    }

    if (data.description) {
      mapped.shortDescription = data.description;
    }

    if (data.productIdentifiers) {
      mapped.productIdentifiers = data.productIdentifiers;
    }

    return mapped;
  }

  mapInventoryUpdate(data: any): any {
    return {
      sku: data.sku,
      quantity: {
        unit: 'EACH',
        amount: data.quantity,
      },
      fulfillmentLagTime: data.fulfillmentLagTime || 1,
    };
  }

  mapShipmentData(data: any): any {
    return {
      orderShipment: {
        orderLines: {
          orderLine: data.orderLines?.map((line: any) => ({
            lineNumber: line.lineNumber,
            orderLineStatuses: {
              orderLineStatus: [
                {
                  status: 'Shipped',
                  statusQuantity: {
                    unitOfMeasurement: 'EACH',
                    amount: line.quantity || 1,
                  },
                  trackingInfo: {
                    shipDateTime: data.shipDate || new Date().toISOString(),
                    carrierName: {
                      carrier: data.carrier || 'USPS',
                    },
                    methodCode: data.methodCode || 'Standard',
                    trackingNumber: data.trackingNumber,
                    trackingURL: data.trackingUrl,
                  },
                },
              ],
            },
          })),
        },
      },
    };
  }

  mapPriceUpdate(data: any): any {
    return {
      sku: data.sku,
      pricing: [
        {
          currentPrice: {
            value: {
              currency: data.currency || 'USD',
              amount: data.price,
            },
          },
          currentPriceType: 'BASE',
        },
      ],
    };
  }
}
