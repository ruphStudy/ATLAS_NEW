import { Injectable } from '@nestjs/common';
import {
  IMeeshoOrder,
  IMeeshoProduct,
  IMeeshoInventory,
  IMeeshoShipment,
  IMeeshoReturn,
  IMeeshoPrice,
} from '../interfaces/meesho.interfaces';
import { IPaginationMetadata } from '../../../interfaces';

@Injectable()
export class MeeshoResponseMapper {
  mapOrder(meeshoOrder: IMeeshoOrder): any {
    return {
      externalOrderId: meeshoOrder.orderId,
      subOrderId: meeshoOrder.subOrderId,
      orderDate: new Date(meeshoOrder.orderPlacedAt),
      status: this.mapOrderStatus(meeshoOrder.orderStatus),
      productId: meeshoOrder.productId,
      sku: meeshoOrder.productSku,
      productName: meeshoOrder.productName,
      quantity: meeshoOrder.quantity,
      sellingPrice: meeshoOrder.sellingPrice,
      shippingCharge: meeshoOrder.shippingCharge,
      totalAmount: meeshoOrder.totalAmount,
      paymentMode: meeshoOrder.paymentMode,
      customer: {
        name: meeshoOrder.customer.name,
        phone: meeshoOrder.customer.phone,
        email: meeshoOrder.customer.email,
      },
      shippingAddress: {
        name: meeshoOrder.shippingAddress.name,
        address: meeshoOrder.shippingAddress.address,
        city: meeshoOrder.shippingAddress.city,
        state: meeshoOrder.shippingAddress.state,
        pincode: meeshoOrder.shippingAddress.pincode,
        phone: meeshoOrder.shippingAddress.phone,
      },
    };
  }

  mapProduct(meeshoProduct: IMeeshoProduct): any {
    return {
      externalProductId: meeshoProduct.productId,
      sku: meeshoProduct.sku,
      title: meeshoProduct.name,
      description: meeshoProduct.description,
      category: meeshoProduct.category,
      subcategory: meeshoProduct.subcategory,
      brand: meeshoProduct.brand,
      mrp: meeshoProduct.mrp,
      sellingPrice: meeshoProduct.sellingPrice,
      stock: meeshoProduct.stock,
      status: this.mapProductStatus(meeshoProduct.status),
      images: meeshoProduct.images,
      attributes: meeshoProduct.attributes,
      hsn: meeshoProduct.hsn,
    };
  }

  mapInventory(meeshoInventory: IMeeshoInventory): any {
    return {
      sku: meeshoInventory.sku,
      productId: meeshoInventory.productId,
      availableStock: meeshoInventory.availableStock,
      reservedStock: meeshoInventory.reservedStock,
      totalStock: meeshoInventory.totalStock,
    };
  }

  mapShipment(meeshoShipment: IMeeshoShipment): any {
    return {
      orderId: meeshoShipment.orderId,
      subOrderId: meeshoShipment.subOrderId,
      trackingId: meeshoShipment.trackingId,
      courierName: meeshoShipment.courierName,
      shippedDate: new Date(meeshoShipment.shippedDate),
      estimatedDelivery: meeshoShipment.estimatedDelivery
        ? new Date(meeshoShipment.estimatedDelivery)
        : undefined,
      status: this.mapShipmentStatus(meeshoShipment.status),
      awbNumber: meeshoShipment.awbNumber,
    };
  }

  mapReturn(meeshoReturn: IMeeshoReturn): any {
    return {
      externalReturnId: meeshoReturn.returnId,
      orderId: meeshoReturn.orderId,
      subOrderId: meeshoReturn.subOrderId,
      productSku: meeshoReturn.productSku,
      quantity: meeshoReturn.quantity,
      returnReason: meeshoReturn.returnReason,
      status: this.mapReturnStatus(meeshoReturn.returnStatus),
      initiatedAt: new Date(meeshoReturn.initiatedAt),
      refundAmount: meeshoReturn.refundAmount,
      pickupAddress: meeshoReturn.pickupAddress,
    };
  }

  mapPrice(meeshoPrice: IMeeshoPrice): any {
    return {
      sku: meeshoPrice.sku,
      productId: meeshoPrice.productId,
      mrp: meeshoPrice.mrp,
      sellingPrice: meeshoPrice.sellingPrice,
      discount: meeshoPrice.discount,
      effectiveFrom: meeshoPrice.effectiveFrom
        ? new Date(meeshoPrice.effectiveFrom)
        : undefined,
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

    if (response.totalCount !== undefined) {
      pagination.totalCount = response.totalCount;
    }

    if (limit && offset !== undefined) {
      pagination.pageSize = limit;
      pagination.currentPage = Math.floor(offset / limit) + 1;

      if (pagination.totalCount) {
        pagination.totalPages = Math.ceil(pagination.totalCount / limit);
        pagination.hasNextPage = offset + limit < pagination.totalCount;
      }
    }

    return Object.keys(pagination).length > 0 ? pagination : undefined;
  }

  private mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PLACED: 'PENDING',
      APPROVED: 'PROCESSING',
      PACKED: 'PROCESSING',
      SHIPPED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
      RETURNED: 'RETURNED',
    };

    return statusMap[status] || status;
  }

  private mapProductStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      PENDING: 'PENDING',
      REJECTED: 'REJECTED',
    };

    return statusMap[status] || status;
  }

  private mapShipmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'PENDING',
      PICKED: 'PICKED',
      IN_TRANSIT: 'IN_TRANSIT',
      DELIVERED: 'DELIVERED',
      RTO: 'RETURNED',
    };

    return statusMap[status] || status;
  }

  private mapReturnStatus(status: string): string {
    const statusMap: Record<string, string> = {
      INITIATED: 'PENDING',
      PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
      IN_TRANSIT: 'IN_TRANSIT',
      RECEIVED: 'RECEIVED',
      REFUNDED: 'COMPLETED',
      REJECTED: 'REJECTED',
    };

    return statusMap[status] || status;
  }
}
