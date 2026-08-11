/** Normalized delivery status, independent of any provider's own vocabulary. */
export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  OPENED = 'OPENED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  UNDELIVERED = 'UNDELIVERED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
