import { ReceivingStatus } from '../interfaces';

export const RECEIVING_CONSTANTS = {
  ALLOWED_STATUS_TRANSITIONS: {
    [ReceivingStatus.SCHEDULED]: [
      ReceivingStatus.IN_PROGRESS,
      ReceivingStatus.CANCELLED,
    ],
    [ReceivingStatus.IN_PROGRESS]: [
      ReceivingStatus.COMPLETED,
      ReceivingStatus.PARTIALLY_RECEIVED,
      ReceivingStatus.CANCELLED,
    ],
    [ReceivingStatus.PARTIALLY_RECEIVED]: [
      ReceivingStatus.IN_PROGRESS,
      ReceivingStatus.COMPLETED,
      ReceivingStatus.CANCELLED,
    ],
    [ReceivingStatus.COMPLETED]: [
      ReceivingStatus.REOPENED,
    ],
    [ReceivingStatus.CANCELLED]: [
      ReceivingStatus.REOPENED,
    ],
    [ReceivingStatus.REOPENED]: [
      ReceivingStatus.IN_PROGRESS,
      ReceivingStatus.COMPLETED,
      ReceivingStatus.CANCELLED,
    ],
  },
};
