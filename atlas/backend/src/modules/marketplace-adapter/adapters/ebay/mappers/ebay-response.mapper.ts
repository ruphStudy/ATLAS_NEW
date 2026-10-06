import { Injectable } from '@nestjs/common';
import {
  IEbayOrder,
  IEbayLineItem,
  IEbayInventoryItem,
  IEbayOffer,
  IEbayReturn,
} from '../interfaces/ebay.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class EbayResponseMapper {
  mapOrder(ebayOrder: IEbayOrder): any {
    const shippingAddress =
      ebayOrder.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;

    return {
      externalOrderId: ebayOrder.orderId,
      orderDate: new Date(ebayOrder.creationDate),
      status: this.mapOrderStatus(ebayOrder.orderFulfillmentStatus),
      totalAmount: parseFloat(ebayOrder.pricingSummary.total.value),
      currency: ebayOrder.pricingSummary.total.currency,
      buyerInfo: {
        username: ebayOrder.buyer.username,
        name:
          ebayOrder.buyer.buyerRegistrationAddress?.fullName ||
          shippingAddress?.fullName,
      },
      shippingAddress: shippingAddress?.contactAddress
        ? {
            addressLine1: shippingAddress.contactAddress.addressLine1,
            addressLine2: shippingAddress.contactAddress.addressLine2,
            city: shippingAddress.contactAddress.city,
            state: shippingAddress.contactAddress.stateOrProvince,
            postalCode: shippingAddress.contactAddress.postalCode,
            country: shippingAddress.contactAddress.countryCode,
          }
        : undefined,
      items: ebayOrder.lineItems?.map((item) => this.mapLineItem(item)),
    };
  }

  mapLineItem(lineItem: IEbayLineItem): any {
    return {
      externalItemId: lineItem.lineItemId,
      legacyItemId: lineItem.legacyItemId,
      sku: lineItem.sku,
      title: lineItem.title,
      quantity: lineItem.quantity,
      unitPrice: parseFloat(lineItem.lineItemCost.value),
      currency: lineItem.lineItemCost.currency,
      status: this.mapLineItemStatus(lineItem.lineItemFulfillmentStatus),
    };
  }

  mapInventoryItem(ebayItem: IEbayInventoryItem): any {
    return {
      sku: ebayItem.sku,
      title: ebayItem.product.title,
      description: ebayItem.product.description,
      imageUrls: ebayItem.product.imageUrls,
      condition: ebayItem.condition,
      availableQuantity:
        ebayItem.availability.shipToLocationAvailability.quantity,
      brand: ebayItem.product.brand,
      mpn: ebayItem.product.mpn,
      upc: ebayItem.product.upc,
      ean: ebayItem.product.ean,
      isbn: ebayItem.product.isbn,
      aspects: ebayItem.product.aspects,
    };
  }

  mapOffer(ebayOffer: IEbayOffer): any {
    return {
      externalOfferId: ebayOffer.offerId,
      sku: ebayOffer.sku,
      marketplaceId: ebayOffer.marketplaceId,
      format: ebayOffer.format,
      availableQuantity: ebayOffer.availableQuantity,
      categoryId: ebayOffer.categoryId,
      description: ebayOffer.listingDescription,
      price: parseFloat(ebayOffer.pricingSummary.price.value),
      currency: ebayOffer.pricingSummary.price.currency,
      status: this.mapOfferStatus(ebayOffer.status),
      fulfillmentPolicyId: ebayOffer.listingPolicies?.fulfillmentPolicyId,
      paymentPolicyId: ebayOffer.listingPolicies?.paymentPolicyId,
      returnPolicyId: ebayOffer.listingPolicies?.returnPolicyId,
    };
  }

  mapReturn(ebayReturn: IEbayReturn): any {
    return {
      externalReturnId: ebayReturn.returnId,
      orderId: ebayReturn.orderId,
      returnDate: new Date(ebayReturn.creationDate),
      status: this.mapReturnStatus(ebayReturn.returnState),
      buyer: {
        username: ebayReturn.buyer.username,
      },
      returnQuantity: ebayReturn.returnQuantity,
      item: {
        itemId: ebayReturn.returnItem.itemId,
        title: ebayReturn.returnItem.title,
      },
      refundAmount: parseFloat(ebayReturn.refundAmount.value),
      currency: ebayReturn.refundAmount.currency,
      reason: ebayReturn.returnReason,
    };
  }

  mapPagination(
    response: any,
    limit?: number,
    offset?: number,
  ): IPaginationMetadata | undefined {
    if (!response) {
      return undefined;
    }

    const pagination: IPaginationMetadata = {};

    if (response.total !== undefined) {
      pagination.totalCount = response.total;
    }

    if (limit && offset !== undefined) {
      pagination.pageSize = limit;
      pagination.currentPage = Math.floor(offset / limit) + 1;

      if (pagination.totalCount) {
        pagination.totalPages = Math.ceil(pagination.totalCount / limit);
        pagination.hasNextPage = offset + limit < pagination.totalCount;
      }
    }

    if (response.next) {
      pagination.nextCursor = this.extractOffsetFromUrl(response.next);
    }

    if (response.prev) {
      pagination.previousCursor = this.extractOffsetFromUrl(response.prev);
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      NOT_STARTED: 'PENDING',
      IN_PROGRESS: 'PROCESSING',
      FULFILLED: 'SHIPPED',
      CANCELLED: 'CANCELLED',
    };

    return statusMap[status] || status;
  }

  private mapLineItemStatus(status: string): string {
    const statusMap: Record<string, string> = {
      NOT_STARTED: 'PENDING',
      IN_PROGRESS: 'PROCESSING',
      FULFILLED: 'SHIPPED',
    };

    return statusMap[status] || status;
  }

  private mapOfferStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PUBLISHED: 'ACTIVE',
      UNPUBLISHED: 'INACTIVE',
      ENDED: 'ENDED',
      OUT_OF_STOCK: 'OUT_OF_STOCK',
    };

    return statusMap[status] || status;
  }

  private mapReturnStatus(status: string): string {
    const statusMap: Record<string, string> = {
      RETURN_OPEN: 'PENDING',
      RETURN_CLOSED: 'COMPLETED',
      RETURN_ESCALATED: 'ESCALATED',
    };

    return statusMap[status] || status;
  }

  private extractOffsetFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('offset') || undefined;
    } catch (error) {
      return undefined;
    }
  }
}
