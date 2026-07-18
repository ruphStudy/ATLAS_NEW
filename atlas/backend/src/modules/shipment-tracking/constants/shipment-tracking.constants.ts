import { ShipmentStatus } from '../interfaces';

export const SHIPMENT_CONSTANTS = {
  NUMBER_PREFIX: 'SHP',
  NUMBER_PAD_LENGTH: 6,

  EVENTS: {
    CREATED: 'shipment.created',
    DISPATCHED: 'shipment.dispatched',
    TRACKING_UPDATED: 'shipment.tracking-updated',
    DELIVERED: 'shipment.delivered',
    DELAYED: 'shipment.delayed',
    CANCELLED: 'shipment.cancelled',
    STATUS_CHANGED: 'shipment.status-changed',
  } as const,

  ALLOWED_TRANSITIONS: {
    [ShipmentStatus.PENDING]: [ShipmentStatus.READY, ShipmentStatus.CANCELLED],
    [ShipmentStatus.READY]: [ShipmentStatus.DISPATCHED, ShipmentStatus.CANCELLED],
    [ShipmentStatus.DISPATCHED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED, ShipmentStatus.CANCELLED],
    [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.CUSTOMS_CLEARANCE, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELAYED, ShipmentStatus.LOST, ShipmentStatus.CANCELLED],
    [ShipmentStatus.CUSTOMS_CLEARANCE]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.DELAYED, ShipmentStatus.CANCELLED],
    [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.DELAYED, ShipmentStatus.CANCELLED],
    [ShipmentStatus.DELAYED]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.CANCELLED],
    [ShipmentStatus.DELIVERED]: [],
    [ShipmentStatus.LOST]: [ShipmentStatus.CANCELLED],
    [ShipmentStatus.CANCELLED]: [],
  } as Record<ShipmentStatus, ShipmentStatus[]>,

  ACTIVE_STATUSES: [
    ShipmentStatus.PENDING,
    ShipmentStatus.READY,
    ShipmentStatus.DISPATCHED,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CUSTOMS_CLEARANCE,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELAYED,
  ] as ShipmentStatus[],

  // Statuses eligible for automatic carrier sync
  TRACKABLE_STATUSES: [
    ShipmentStatus.DISPATCHED,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CUSTOMS_CLEARANCE,
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELAYED,
  ] as ShipmentStatus[],
} as const;

export const SHIPMENT_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const TRACKING_SYNC_QUEUE_CONFIG = {
  CONCURRENCY: 3,
  ATTEMPTS: 5,
  BACKOFF_DELAY_MS: 10000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 100,
} as const;
