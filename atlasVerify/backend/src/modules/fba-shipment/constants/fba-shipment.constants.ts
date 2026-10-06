import { FBAShipmentStatus } from '../interfaces';

export const ALLOWED_STATUS_TRANSITIONS: Record<
  FBAShipmentStatus,
  FBAShipmentStatus[]
> = {
  [FBAShipmentStatus.DRAFT]: [
    FBAShipmentStatus.PLANNED,
    FBAShipmentStatus.CANCELLED,
  ],
  [FBAShipmentStatus.PLANNED]: [
    FBAShipmentStatus.APPROVED,
    FBAShipmentStatus.DRAFT,
    FBAShipmentStatus.CANCELLED,
  ],
  [FBAShipmentStatus.APPROVED]: [
    FBAShipmentStatus.PREPARING,
    FBAShipmentStatus.PLANNED,
    FBAShipmentStatus.CANCELLED,
  ],
  [FBAShipmentStatus.PREPARING]: [
    FBAShipmentStatus.DISPATCHED,
    FBAShipmentStatus.CANCELLED,
  ],
  [FBAShipmentStatus.DISPATCHED]: [
    FBAShipmentStatus.SHIPPED,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.SHIPPED]: [
    FBAShipmentStatus.IN_TRANSIT,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.IN_TRANSIT]: [
    FBAShipmentStatus.DELIVERED,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.DELIVERED]: [
    FBAShipmentStatus.CHECKED_IN,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.CHECKED_IN]: [
    FBAShipmentStatus.RECEIVING,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.RECEIVING]: [
    FBAShipmentStatus.RECEIVED,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.RECEIVED]: [
    FBAShipmentStatus.CLOSED,
    FBAShipmentStatus.PROBLEM,
  ],
  [FBAShipmentStatus.CLOSED]: [],
  [FBAShipmentStatus.PROBLEM]: [
    FBAShipmentStatus.IN_TRANSIT,
    FBAShipmentStatus.RECEIVING,
    FBAShipmentStatus.CLOSED,
    FBAShipmentStatus.CANCELLED,
  ],
  [FBAShipmentStatus.CANCELLED]: [],
};

export const FBA_SHIPMENT_PREFIX = 'FBA';
