import { Injectable } from '@nestjs/common';
import {
  IWalmartOrder,
  IWalmartOrderLine,
  IWalmartItem,
  IWalmartInventory,
  IWalmartShipment,
  IWalmartReturn,
  IWalmartPrice,
} from '../interfaces/walmart.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class WalmartResponseMapper {
  mapOrder(walmartOrder: IWalmartOrder): any {
    return {
      externalOrderId: walmartOrder.purchaseOrderId,
      customerOrderId: walmartOrder.customerOrderId,
      orderDate: new Date(walmartOrder.orderDate),
      status: this.mapOrderStatus(walmartOrder.orderLines),
      totalAmount: walmartOrder.orderTotal?.currencyAmount,
      currency: walmartOrder.orderTotal?.currencyUnit || 'USD',
      email: walmartOrder.customerEmailId,
      buyerInfo: walmartOrder.buyerInfo,
      shippingAddress: walmartOrder.shippingInfo,
      items: walmartOrder.orderLines?.map((line) => this.mapOrderLine(line)),
    };
  }

  mapOrderLine(line: IWalmartOrderLine): any {
    const productCharge = line.charges.charge.find(
      (c) => c.chargeType === 'PRODUCT',
    );

    return {
      externalItemId: line.lineNumber,
      sku: line.item.sku,
      title: line.item.productName,
      quantity: line.orderLineQuantity.amount,
      unitPrice: productCharge?.chargeAmount.amount || 0,
      fulfillmentType: line.fulfillment?.fulfillmentOption,
      status: this.mapLineStatus(line.orderLineStatuses),
    };
  }

  mapItem(walmartItem: IWalmartItem): any {
    return {
      sku: walmartItem.sku,
      title: walmartItem.productName,
      productType: walmartItem.productType,
      price: walmartItem.price.amount,
      currency: walmartItem.price.currency,
      status: this.mapItemStatus(walmartItem.publishedStatus),
      lifecycleStatus: walmartItem.lifecycleStatus,
      productIdentifiers: walmartItem.productIdentifiers,
    };
  }

  mapInventory(walmartInventory: IWalmartInventory): any {
    return {
      sku: walmartInventory.sku,
      availableQuantity: walmartInventory.quantity.amount,
      fulfillmentLagTime: walmartInventory.fulfillmentLagTime,
    };
  }

  mapShipment(shipment: IWalmartShipment): any {
    return {
      orderLineId: shipment.orderLineId,
      shipDate: new Date(shipment.shipDateTime),
      carrier: shipment.carrier,
      methodCode: shipment.methodCode,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingURL,
    };
  }

  mapReturn(walmartReturn: IWalmartReturn): any {
    return {
      externalReturnId: walmartReturn.returnOrderId,
      orderId: walmartReturn.customerOrderId,
      returnDate: new Date(walmartReturn.returnOrderDate),
      status: this.mapReturnStatus(walmartReturn.returnStatus),
      items: walmartReturn.returnOrderLines?.map((line) => ({
        lineNumber: line.lineNumber,
        sku: line.sku,
        quantity: line.returnQuantity,
        reason: line.returnReason,
        refundAmount: line.refundAmount.amount,
        currency: line.refundAmount.currency,
      })),
    };
  }

  mapPrice(walmartPrice: IWalmartPrice): any {
    const currentPrice = walmartPrice.pricing[0]?.currentPrice;

    return {
      sku: walmartPrice.sku,
      price: currentPrice?.value.amount,
      currency: currentPrice?.value.currency || 'USD',
      priceType: walmartPrice.pricing[0]?.currentPriceType,
    };
  }

  mapPagination(response: any, limit?: number): IPaginationMetadata | undefined {
    if (!response) {
      return undefined;
    }

    const pagination: IPaginationMetadata = {};

    if (response.totalCount !== undefined) {
      pagination.totalCount = response.totalCount;
    }

    if (response.offset !== undefined && limit) {
      pagination.currentPage = Math.floor(response.offset / limit) + 1;
      pagination.pageSize = limit;
      
      if (pagination.totalCount) {
        pagination.totalPages = Math.ceil(pagination.totalCount / limit);
        pagination.hasNextPage = response.offset + limit < pagination.totalCount;
      }
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  private mapOrderStatus(orderLines: IWalmartOrderLine[]): string {
    if (!orderLines || orderLines.length === 0) {
      return 'PENDING';
    }

    const statuses = orderLines.flatMap((line) =>
      line.orderLineStatuses.orderLineStatus.map((s) => s.status),
    );

    if (statuses.every((s) => s === 'Shipped' || s === 'Delivered')) {
      return 'SHIPPED';
    }

    if (statuses.some((s) => s === 'Cancelled')) {
      return 'CANCELLED';
    }

    if (statuses.some((s) => s === 'Shipped')) {
      return 'PARTIALLY_SHIPPED';
    }

    return 'PROCESSING';
  }

  private mapLineStatus(orderLineStatuses: any): string {
    const status = orderLineStatuses.orderLineStatus[0]?.status;

    const statusMap: Record<string, string> = {
      Created: 'PENDING',
      Acknowledged: 'PROCESSING',
      Shipped: 'SHIPPED',
      Delivered: 'DELIVERED',
      Cancelled: 'CANCELLED',
    };

    return statusMap[status] || status;
  }

  private mapItemStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PUBLISHED: 'ACTIVE',
      UNPUBLISHED: 'INACTIVE',
      SYSTEM_PROBLEM: 'ERROR',
      IN_PROGRESS: 'PENDING',
    };

    return statusMap[status] || status;
  }

  private mapReturnStatus(status: string): string {
    const statusMap: Record<string, string> = {
      INITIATED: 'PENDING',
      REFUNDED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
    };

    return statusMap[status] || status;
  }
}
