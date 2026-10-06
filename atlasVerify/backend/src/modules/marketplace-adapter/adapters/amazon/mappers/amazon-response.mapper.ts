import { Injectable } from '@nestjs/common';
import {
  IAmazonOrder,
  IAmazonListing,
  IAmazonInventoryItem,
  IAmazonCatalogItem,
  IAmazonShipment,
  IAmazonReturn,
  IAmazonReport,
  IAmazonPricing,
} from '../interfaces/amazon.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class AmazonResponseMapper {
  mapOrder(amazonOrder: IAmazonOrder): any {
    return {
      externalOrderId: amazonOrder.AmazonOrderId,
      sellerOrderId: amazonOrder.SellerOrderId,
      orderDate: new Date(amazonOrder.PurchaseDate),
      lastUpdateDate: new Date(amazonOrder.LastUpdateDate),
      status: this.mapOrderStatus(amazonOrder.OrderStatus),
      fulfillmentChannel: amazonOrder.FulfillmentChannel,
      salesChannel: amazonOrder.SalesChannel,
      totalAmount: amazonOrder.OrderTotal
        ? parseFloat(amazonOrder.OrderTotal.Amount)
        : undefined,
      currency: amazonOrder.OrderTotal?.CurrencyCode,
      itemsShipped: amazonOrder.NumberOfItemsShipped,
      itemsUnshipped: amazonOrder.NumberOfItemsUnshipped,
      marketplace: amazonOrder.MarketplaceId,
      shippingAddress: amazonOrder.ShippingAddress,
      buyerInfo: amazonOrder.BuyerInfo,
      isPrime: amazonOrder.IsPrime,
      isBusinessOrder: amazonOrder.IsBusinessOrder,
      items: amazonOrder.OrderItems?.map((item) => this.mapOrderItem(item)),
    };
  }

  mapOrderItem(item: any): any {
    return {
      externalItemId: item.OrderItemId,
      asin: item.ASIN,
      sku: item.SellerSKU,
      title: item.Title,
      quantityOrdered: item.QuantityOrdered,
      quantityShipped: item.QuantityShipped,
      itemPrice: item.ItemPrice
        ? parseFloat(item.ItemPrice.Amount)
        : undefined,
      itemTax: item.ItemTax ? parseFloat(item.ItemTax.Amount) : undefined,
      promotionDiscount: item.PromotionDiscount
        ? parseFloat(item.PromotionDiscount.Amount)
        : undefined,
      currency: item.ItemPrice?.CurrencyCode,
      condition: item.ConditionId,
      isGift: item.IsGift,
    };
  }

  mapListing(amazonListing: IAmazonListing): any {
    return {
      sku: amazonListing.sku,
      asin: amazonListing.asin,
      listingId: amazonListing.listingId,
      title: amazonListing.itemName,
      description: amazonListing.itemDescription,
      price: amazonListing.price?.amount,
      currency: amazonListing.price?.currencyCode,
      quantity: amazonListing.quantity,
      status: this.mapListingStatus(amazonListing.status),
      fulfillmentChannel: amazonListing.fulfillmentChannel,
      productType: amazonListing.productType,
      condition: amazonListing.condition,
      marketplace: amazonListing.marketplace,
    };
  }

  mapInventory(amazonInventory: IAmazonInventoryItem): any {
    return {
      sku: amazonInventory.sellerSku,
      asin: amazonInventory.asin,
      condition: amazonInventory.condition,
      totalQuantity: amazonInventory.totalQuantity,
      availableQuantity: amazonInventory.fulfillableQuantity,
      inboundQuantity:
        (amazonInventory.inboundWorkingQuantity || 0) +
        (amazonInventory.inboundShippedQuantity || 0) +
        (amazonInventory.inboundReceivingQuantity || 0),
      reservedQuantity: amazonInventory.reservedQuantity,
      unfulfillableQuantity: amazonInventory.unfulfillableQuantity,
      lastUpdated: amazonInventory.lastUpdatedTime
        ? new Date(amazonInventory.lastUpdatedTime)
        : undefined,
    };
  }

  mapCatalogItem(amazonCatalog: IAmazonCatalogItem): any {
    return {
      asin: amazonCatalog.asin,
      identifiers: amazonCatalog.identifiers,
      images: amazonCatalog.images,
      productTypes: amazonCatalog.productTypes,
      salesRanks: amazonCatalog.salesRanks,
      summaries: amazonCatalog.summaries,
      attributes: amazonCatalog.attributes,
    };
  }

  mapShipment(amazonShipment: IAmazonShipment): any {
    return {
      externalShipmentId: amazonShipment.shipmentId,
      orderId: amazonShipment.amazonOrderId,
      status: this.mapShipmentStatus(amazonShipment.shipmentStatus),
      carrier: amazonShipment.carrier,
      trackingNumber: amazonShipment.trackingNumber,
      shipDate: amazonShipment.shipDate
        ? new Date(amazonShipment.shipDate)
        : undefined,
      estimatedArrival: amazonShipment.estimatedArrivalDate
        ? new Date(amazonShipment.estimatedArrivalDate)
        : undefined,
      items: amazonShipment.items,
    };
  }

  mapReturn(amazonReturn: IAmazonReturn): any {
    return {
      externalReturnId: amazonReturn.returnId,
      orderId: amazonReturn.amazonOrderId,
      status: this.mapReturnStatus(amazonReturn.returnStatus),
      reasonCode: amazonReturn.sellerReturnReasonCode,
      returnDate: amazonReturn.returnDate
        ? new Date(amazonReturn.returnDate)
        : undefined,
      items: amazonReturn.items,
    };
  }

  mapReport(amazonReport: IAmazonReport): any {
    return {
      externalReportId: amazonReport.reportId,
      reportType: amazonReport.reportType,
      status: amazonReport.processingStatus,
      dataStartTime: amazonReport.dataStartTime
        ? new Date(amazonReport.dataStartTime)
        : undefined,
      dataEndTime: amazonReport.dataEndTime
        ? new Date(amazonReport.dataEndTime)
        : undefined,
      createdTime: new Date(amazonReport.createdTime),
      processingStartTime: amazonReport.processingStartTime
        ? new Date(amazonReport.processingStartTime)
        : undefined,
      processingEndTime: amazonReport.processingEndTime
        ? new Date(amazonReport.processingEndTime)
        : undefined,
      documentId: amazonReport.reportDocumentId,
    };
  }

  mapPricing(amazonPricing: IAmazonPricing): any {
    return {
      sku: amazonPricing.sku,
      asin: amazonPricing.asin,
      listingPrice: amazonPricing.listingPrice?.amount,
      shippingPrice: amazonPricing.shipping?.amount,
      landedPrice: amazonPricing.landedPrice?.amount,
      currency: amazonPricing.listingPrice?.currencyCode,
      competitivePrices: amazonPricing.competitivePrices,
      lowestPrices: amazonPricing.lowestPrices,
    };
  }

  mapPagination(response: any): IPaginationMetadata | undefined {
    if (!response) {
      return undefined;
    }

    const pagination: IPaginationMetadata = {};

    if (response.NextToken) {
      pagination.nextCursor = response.NextToken;
      pagination.hasNextPage = true;
    } else {
      pagination.hasNextPage = false;
    }

    if (response.TotalResultCount !== undefined) {
      pagination.totalCount = response.TotalResultCount;
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      Pending: 'PENDING',
      Unshipped: 'PROCESSING',
      PartiallyShipped: 'PARTIALLY_SHIPPED',
      Shipped: 'SHIPPED',
      Canceled: 'CANCELLED',
      Unfulfillable: 'FAILED',
      InvoiceUnconfirmed: 'PENDING',
      PendingAvailability: 'PENDING',
    };

    return statusMap[status] || status;
  }

  private mapListingStatus(status: any): string {
    if (!status) {
      return 'UNKNOWN';
    }

    const statusMap: Record<string, string> = {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      INCOMPLETE: 'INCOMPLETE',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  private mapShipmentStatus(status: any): string {
    if (!status) {
      return 'UNKNOWN';
    }

    const statusMap: Record<string, string> = {
      Working: 'PREPARING',
      Shipped: 'SHIPPED',
      Receiving: 'IN_TRANSIT',
      Cancelled: 'CANCELLED',
      Deleted: 'CANCELLED',
      Closed: 'DELIVERED',
      Error: 'FAILED',
      IN_TRANSIT: 'IN_TRANSIT',
      DELIVERED: 'DELIVERED',
      CHECKED_IN: 'DELIVERED',
      RECEIVING: 'IN_TRANSIT',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  private mapReturnStatus(status: any): string {
    if (!status) {
      return 'UNKNOWN';
    }

    const statusMap: Record<string, string> = {
      Pending: 'PENDING',
      Approved: 'APPROVED',
      Rejected: 'REJECTED',
      Closed: 'COMPLETED',
    };

    return statusMap[status] || 'UNKNOWN';
  }
}
