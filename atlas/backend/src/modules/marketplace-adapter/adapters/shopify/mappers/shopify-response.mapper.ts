import { Injectable } from '@nestjs/common';
import {
  IShopifyOrder,
  IShopifyLineItem,
  IShopifyProduct,
  IShopifyVariant,
  IShopifyInventoryLevel,
  IShopifyFulfillment,
  IShopifyRefund,
  IShopifyPageInfo,
} from '../interfaces/shopify.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class ShopifyResponseMapper {
  mapOrder(shopifyOrder: any): any {
    return {
      externalOrderId: this.extractGid(shopifyOrder.id),
      orderNumber: shopifyOrder.name,
      orderDate: new Date(shopifyOrder.createdAt),
      lastUpdateDate: new Date(shopifyOrder.updatedAt),
      status: this.mapOrderStatus(shopifyOrder.displayFulfillmentStatus),
      financialStatus: shopifyOrder.displayFinancialStatus,
      fulfillmentStatus: shopifyOrder.displayFulfillmentStatus,
      currency: shopifyOrder.currencyCode,
      totalAmount: parseFloat(
        shopifyOrder.currentTotalPriceSet?.shopMoney?.amount || '0',
      ),
      subtotalAmount: parseFloat(
        shopifyOrder.currentSubtotalPriceSet?.shopMoney?.amount || '0',
      ),
      email: shopifyOrder.email,
      customer: shopifyOrder.customer
        ? {
            id: this.extractGid(shopifyOrder.customer.id),
            email: shopifyOrder.customer.email,
            firstName: shopifyOrder.customer.firstName,
            lastName: shopifyOrder.customer.lastName,
          }
        : undefined,
      shippingAddress: shopifyOrder.shippingAddress,
      items: shopifyOrder.lineItems?.edges?.map((edge: any) =>
        this.mapLineItem(edge.node),
      ),
      cancelledAt: shopifyOrder.cancelledAt
        ? new Date(shopifyOrder.cancelledAt)
        : undefined,
      closedAt: shopifyOrder.closedAt
        ? new Date(shopifyOrder.closedAt)
        : undefined,
    };
  }

  mapLineItem(item: any): any {
    return {
      externalItemId: this.extractGid(item.id),
      productId: item.product?.id ? this.extractGid(item.product.id) : undefined,
      variantId: item.variant?.id ? this.extractGid(item.variant.id) : undefined,
      title: item.title,
      variantTitle: item.variantTitle,
      sku: item.sku,
      quantity: item.quantity,
      fulfillableQuantity: item.fulfillableQuantity,
      unitPrice: parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0'),
      totalDiscount: parseFloat(item.totalDiscountSet?.shopMoney?.amount || '0'),
      fulfillmentStatus: item.fulfillmentStatus,
    };
  }

  mapProduct(shopifyProduct: any): any {
    return {
      externalProductId: this.extractGid(shopifyProduct.id),
      title: shopifyProduct.title,
      description: shopifyProduct.descriptionHtml,
      vendor: shopifyProduct.vendor,
      productType: shopifyProduct.productType,
      status: this.mapProductStatus(shopifyProduct.status),
      tags: shopifyProduct.tags,
      createdAt: new Date(shopifyProduct.createdAt),
      updatedAt: new Date(shopifyProduct.updatedAt),
      publishedAt: shopifyProduct.publishedAt
        ? new Date(shopifyProduct.publishedAt)
        : undefined,
      variants: shopifyProduct.variants?.edges?.map((edge: any) =>
        this.mapVariant(edge.node),
      ),
      images: shopifyProduct.images?.edges?.map((edge: any) => ({
        id: this.extractGid(edge.node.id),
        url: edge.node.url,
        altText: edge.node.altText,
        width: edge.node.width,
        height: edge.node.height,
      })),
      options: shopifyProduct.options?.map((option: any) => ({
        id: this.extractGid(option.id),
        name: option.name,
        position: option.position,
        values: option.values,
      })),
    };
  }

  mapVariant(variant: any): any {
    return {
      externalVariantId: this.extractGid(variant.id),
      title: variant.title,
      sku: variant.sku,
      price: parseFloat(variant.price),
      compareAtPrice: variant.compareAtPrice
        ? parseFloat(variant.compareAtPrice)
        : undefined,
      position: variant.position,
      inventoryPolicy: variant.inventoryPolicy,
      inventoryQuantity: variant.inventoryQuantity,
      inventoryItemId: variant.inventoryItem?.id
        ? this.extractGid(variant.inventoryItem.id)
        : undefined,
      weight: variant.weight,
      weightUnit: variant.weightUnit,
      requiresShipping: variant.requiresShipping,
      barcode: variant.barcode,
    };
  }

  mapInventory(inventoryLevel: any): any {
    return {
      inventoryItemId: this.extractGid(inventoryLevel.inventoryItemId),
      locationId: this.extractGid(inventoryLevel.locationId),
      availableQuantity: inventoryLevel.available,
    };
  }

  mapFulfillment(fulfillment: any): any {
    return {
      externalFulfillmentId: this.extractGid(fulfillment.id),
      orderId: this.extractGid(fulfillment.orderId),
      status: fulfillment.status,
      trackingCompany: fulfillment.trackingCompany,
      trackingNumber: fulfillment.trackingNumber,
      trackingNumbers: fulfillment.trackingNumbers,
      trackingUrl: fulfillment.trackingUrl,
      trackingUrls: fulfillment.trackingUrls,
      createdAt: new Date(fulfillment.createdAt),
      updatedAt: new Date(fulfillment.updatedAt),
      lineItems: fulfillment.lineItems?.map((item: any) =>
        this.mapLineItem(item),
      ),
    };
  }

  mapRefund(refund: any): any {
    return {
      externalRefundId: this.extractGid(refund.id),
      orderId: this.extractGid(refund.orderId),
      createdAt: new Date(refund.createdAt),
      note: refund.note,
      refundLineItems: refund.refundLineItems?.map((item: any) => ({
        id: this.extractGid(item.id),
        lineItemId: this.extractGid(item.lineItemId),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        totalTax: parseFloat(item.totalTax),
      })),
      transactions: refund.transactions?.map((transaction: any) => ({
        id: this.extractGid(transaction.id),
        amount: parseFloat(transaction.amount),
        kind: transaction.kind,
        status: transaction.status,
      })),
    };
  }

  mapLocation(location: any): any {
    return {
      id: this.extractGid(location.id),
      name: location.name,
      address1: location.address?.address1,
      address2: location.address?.address2,
      city: location.address?.city,
      province: location.address?.province,
      country: location.address?.country,
      zip: location.address?.zip,
      active: location.isActive,
    };
  }

  mapPagination(pageInfo: IShopifyPageInfo): IPaginationMetadata | undefined {
    if (!pageInfo) {
      return undefined;
    }

    return {
      hasNextPage: pageInfo.hasNextPage,
      hasPreviousPage: pageInfo.hasPreviousPage,
      nextCursor: pageInfo.endCursor,
      previousCursor: pageInfo.startCursor,
    };
  }

  private mapOrderStatus(fulfillmentStatus: string): string {
    const statusMap: Record<string, string> = {
      UNFULFILLED: 'PENDING',
      PARTIAL: 'PARTIALLY_SHIPPED',
      FULFILLED: 'SHIPPED',
      SCHEDULED: 'PROCESSING',
      RESTOCKED: 'CANCELLED',
    };

    return statusMap[fulfillmentStatus] || fulfillmentStatus;
  }

  private mapProductStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'ACTIVE',
      ARCHIVED: 'ARCHIVED',
      DRAFT: 'INACTIVE',
    };

    return statusMap[status] || status;
  }

  private extractGid(gid: string): string {
    if (!gid) {
      return '';
    }

    const parts = gid.split('/');
    return parts[parts.length - 1];
  }

  toGid(resource: string, id: string): string {
    return `gid://shopify/${resource}/${id}`;
  }
}
