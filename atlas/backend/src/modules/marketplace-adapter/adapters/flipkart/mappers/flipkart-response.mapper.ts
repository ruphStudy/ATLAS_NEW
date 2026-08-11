import { Injectable } from '@nestjs/common';
import {
  IFlipkartOrder,
  IFlipkartOrderItem,
  IFlipkartListing,
  IFlipkartInventory,
  IFlipkartShipment,
  IFlipkartReturn,
  IFlipkartPricing,
  IFlipkartProduct,
  IFlipkartReport,
} from '../interfaces/flipkart.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class FlipkartResponseMapper {
  mapOrder(flipkartOrder: IFlipkartOrder): any {
    return {
      externalOrderId: flipkartOrder.orderId,
      orderDate: new Date(flipkartOrder.orderDate),
      status: this.mapOrderStatus(flipkartOrder.status),
      fulfillmentChannel: flipkartOrder.fulfillmentType,
      shippingAddress: flipkartOrder.shippingAddress,
      totalAmount: flipkartOrder.totalPrice,
      currency: flipkartOrder.currency || 'INR',
      items: flipkartOrder.orderItems?.map((item) => this.mapOrderItem(item)),
    };
  }

  mapOrderItem(item: IFlipkartOrderItem): any {
    return {
      externalItemId: item.orderItemId,
      sku: item.sku,
      fsn: item.fsn,
      title: item.productTitle,
      quantityOrdered: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      hsn: item.hsn,
      cancellable: item.cancellable,
      returnWindow: item.returnWindow,
    };
  }

  mapListing(flipkartListing: IFlipkartListing): any {
    return {
      sku: flipkartListing.sku,
      fsn: flipkartListing.fsn,
      listingId: flipkartListing.listingId,
      title: flipkartListing.title,
      mrp: flipkartListing.mrp,
      sellingPrice: flipkartListing.sellingPrice,
      status: this.mapListingStatus(flipkartListing.listingStatus),
      fulfillmentType: flipkartListing.fulfillmentType,
      quantity: flipkartListing.quantity,
      procurementSLA: flipkartListing.procurementSLA,
    };
  }

  mapInventory(flipkartInventory: IFlipkartInventory): any {
    return {
      sku: flipkartInventory.sku,
      fsn: flipkartInventory.fsn,
      availableQuantity: flipkartInventory.inventory,
      fulfillmentType: flipkartInventory.fulfillmentType,
    };
  }

  mapProduct(flipkartProduct: IFlipkartProduct): any {
    return {
      fsn: flipkartProduct.fsn,
      title: flipkartProduct.productTitle,
      description: flipkartProduct.productDescription,
      brand: flipkartProduct.brand,
      vertical: flipkartProduct.vertical,
      category: flipkartProduct.category,
      attributes: flipkartProduct.attributes,
      images: flipkartProduct.imageUrls,
    };
  }

  mapShipment(flipkartShipment: IFlipkartShipment): any {
    return {
      externalShipmentId: flipkartShipment.shipmentId,
      orderId: flipkartShipment.orderId,
      status: this.mapShipmentStatus(flipkartShipment.status),
      trackingNumber: flipkartShipment.trackingId,
      carrier: flipkartShipment.courier,
      dispatchByDate: flipkartShipment.dispatchByDate
        ? new Date(flipkartShipment.dispatchByDate)
        : undefined,
      dispatchAfterDate: flipkartShipment.dispatchAfterDate
        ? new Date(flipkartShipment.dispatchAfterDate)
        : undefined,
      items: flipkartShipment.items,
    };
  }

  mapReturn(flipkartReturn: IFlipkartReturn): any {
    return {
      externalReturnId: flipkartReturn.returnId,
      orderId: flipkartReturn.orderId,
      orderItemId: flipkartReturn.orderItemId,
      status: this.mapReturnStatus(flipkartReturn.status),
      reason: flipkartReturn.returnReason,
      returnType: flipkartReturn.returnType,
      returnDate: flipkartReturn.returnDate
        ? new Date(flipkartReturn.returnDate)
        : undefined,
      refundAmount: flipkartReturn.refundAmount,
    };
  }

  mapPricing(flipkartPricing: IFlipkartPricing): any {
    return {
      sku: flipkartPricing.sku,
      fsn: flipkartPricing.fsn,
      mrp: flipkartPricing.mrp,
      sellingPrice: flipkartPricing.sellingPrice,
      currency: flipkartPricing.currency,
      specialPrice: flipkartPricing.specialPrice,
      specialPriceStartDate: flipkartPricing.specialPriceStartDate,
      specialPriceEndDate: flipkartPricing.specialPriceEndDate,
    };
  }

  mapReport(flipkartReport: IFlipkartReport): any {
    return {
      externalReportId: flipkartReport.reportId,
      reportType: flipkartReport.reportType,
      status: flipkartReport.status,
      requestedDate: new Date(flipkartReport.requestedDate),
      completedDate: flipkartReport.completedDate
        ? new Date(flipkartReport.completedDate)
        : undefined,
      downloadUrl: flipkartReport.downloadUrl,
    };
  }

  mapPagination(response: any): IPaginationMetadata | undefined {
    if (!response) {
      return undefined;
    }

    const pagination: IPaginationMetadata = {};

    if (response.total !== undefined) {
      pagination.totalCount = response.total;
    }

    if (response.hasMore !== undefined) {
      pagination.hasNextPage = response.hasMore;
    }

    if (response.nextPageToken) {
      pagination.nextCursor = response.nextPageToken;
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      APPROVED: 'PROCESSING',
      PENDING: 'PENDING',
      READY_TO_DISPATCH: 'PROCESSING',
      PACKED: 'PROCESSING',
      FORM_FAILED: 'FAILED',
      CANCELLED: 'CANCELLED',
      DELIVERED: 'DELIVERED',
      SHIPPED: 'SHIPPED',
      PICKUP_COMPLETE: 'SHIPPED',
      RETURN_REQUESTED: 'RETURN_REQUESTED',
      RETURNED: 'RETURNED',
    };

    return statusMap[status] || status;
  }

  private mapListingStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      DEACTIVATED: 'INACTIVE',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  private mapShipmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'PENDING',
      PACKED: 'PREPARING',
      READY_TO_DISPATCH: 'PREPARING',
      DISPATCHED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURN_REQUESTED: 'RETURN_REQUESTED',
      RETURNED: 'RETURNED',
    };

    return statusMap[status] || 'UNKNOWN';
  }

  private mapReturnStatus(status: string): string {
    const statusMap: Record<string, string> = {
      REQUESTED: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PICKED: 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED',
    };

    return statusMap[status] || 'UNKNOWN';
  }
}
