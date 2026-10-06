import { PackingStatus } from '../interfaces';

export const PACKING_CONSTANTS = {
  ALLOWED_STATUS_TRANSITIONS: {
    [PackingStatus.PENDING]: [
      PackingStatus.ASSIGNED,
      PackingStatus.CANCELLED,
    ],
    [PackingStatus.ASSIGNED]: [
      PackingStatus.IN_PROGRESS,
      PackingStatus.CANCELLED,
      PackingStatus.PENDING,
    ],
    [PackingStatus.IN_PROGRESS]: [
      PackingStatus.PAUSED,
      PackingStatus.COMPLETED,
      PackingStatus.CANCELLED,
    ],
    [PackingStatus.PAUSED]: [
      PackingStatus.IN_PROGRESS,
      PackingStatus.CANCELLED,
    ],
    [PackingStatus.COMPLETED]: [
      PackingStatus.REOPENED,
    ],
    [PackingStatus.CANCELLED]: [] as PackingStatus[],
    [PackingStatus.REOPENED]: [
      PackingStatus.IN_PROGRESS,
      PackingStatus.CANCELLED,
    ],
  },
};
