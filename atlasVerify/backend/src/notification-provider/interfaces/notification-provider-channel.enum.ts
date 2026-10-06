/**
 * Notification delivery channels. New channels are added here as the
 * business needs them — concrete adapters (email/SMS/WhatsApp/push
 * vendors) live entirely outside this foundation layer.
 */
export enum NotificationProviderChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
}
