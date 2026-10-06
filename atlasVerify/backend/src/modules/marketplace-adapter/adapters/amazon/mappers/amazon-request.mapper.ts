import { Injectable } from '@nestjs/common';
import { IPaginationParams } from '../../../interfaces';

@Injectable()
export class AmazonRequestMapper {
  mapPagination(params?: IPaginationParams): Record<string, any> {
    if (!params) {
      return {};
    }

    const mapped: Record<string, any> = {};

    if (params.cursor) {
      mapped.NextToken = params.cursor;
    }

    if (params.limit) {
      mapped.MaxResultsPerPage = Math.min(params.limit, 100);
    }

    return mapped;
  }

  mapOrderFilters(filters?: {
    startDate?: Date;
    endDate?: Date;
    marketplaceIds?: string[];
    orderStatuses?: string[];
  }): Record<string, any> {
    if (!filters) {
      return {};
    }

    const mapped: Record<string, any> = {};

    if (filters.startDate) {
      mapped.CreatedAfter = filters.startDate.toISOString();
    }

    if (filters.endDate) {
      mapped.CreatedBefore = filters.endDate.toISOString();
    }

    if (filters.marketplaceIds) {
      mapped.MarketplaceIds = filters.marketplaceIds;
    }

    if (filters.orderStatuses) {
      mapped.OrderStatuses = filters.orderStatuses;
    }

    return mapped;
  }

  mapListingData(data: any): any {
    const mapped: any = {
      productType: data.productType || 'PRODUCT',
      requirements: 'LISTING',
      attributes: {},
    };

    if (data.title) {
      mapped.attributes.item_name = [{ value: data.title, marketplace_id: data.marketplaceId }];
    }

    if (data.description) {
      mapped.attributes.product_description = [
        { value: data.description, marketplace_id: data.marketplaceId },
      ];
    }

    if (data.price) {
      mapped.attributes.purchasable_offer = [
        {
          marketplace_id: data.marketplaceId,
          currency: data.price.currencyCode || 'USD',
          our_price: [{ schedule: [{ value_with_tax: data.price.amount }] }],
        },
      ];
    }

    if (data.quantity !== undefined) {
      mapped.attributes.fulfillment_availability = [
        {
          fulfillment_channel_code: data.fulfillmentChannel || 'DEFAULT',
          quantity: data.quantity,
        },
      ];
    }

    if (data.condition) {
      mapped.attributes.condition_type = [{ value: data.condition }];
    }

    return mapped;
  }

  mapInventoryUpdate(data: any): any {
    return {
      sellerSku: data.sku,
      quantity: data.quantity,
      fulfillmentChannelCode: data.fulfillmentChannel || 'DEFAULT',
    };
  }

  mapShipmentData(data: any): any {
    return {
      InboundShipmentHeader: {
        ShipmentName: data.name || `Shipment-${Date.now()}`,
        ShipFromAddress: this.mapAddress(data.shipFromAddress),
        DestinationFulfillmentCenterId: data.destinationCenterId,
        LabelPrepPreference: data.labelPrepPreference || 'SELLER_LABEL',
        IntendedBoxContentsSource: data.boxContentsSource || 'NONE',
        ShipmentStatus: data.status || 'WORKING',
      },
      InboundShipmentItems: data.items?.map((item: any) => ({
        SellerSKU: item.sku,
        QuantityShipped: item.quantity,
        QuantityInCase: item.quantityPerCase || item.quantity,
      })),
    };
  }

  mapReportRequest(reportType: string, params?: any): any {
    const mapped: any = {
      reportType,
      marketplaceIds: params?.marketplaceIds || [],
    };

    if (params?.startDate) {
      mapped.dataStartTime = params.startDate.toISOString();
    }

    if (params?.endDate) {
      mapped.dataEndTime = params.endDate.toISOString();
    }

    if (params?.reportOptions) {
      mapped.reportOptions = params.reportOptions;
    }

    return mapped;
  }

  mapPricingUpdate(data: any): any {
    return {
      price: {
        listingPrice: {
          currencyCode: data.currencyCode || 'USD',
          amount: data.amount,
        },
      },
    };
  }

  private mapAddress(address: any): any {
    if (!address) {
      return undefined;
    }

    return {
      Name: address.name,
      AddressLine1: address.line1,
      AddressLine2: address.line2,
      City: address.city,
      StateOrProvinceCode: address.state,
      PostalCode: address.postalCode,
      CountryCode: address.countryCode,
    };
  }
}
