import { DispatchStatus } from '../interfaces';

export const DISPATCH_CONSTANTS = {
  ALLOWED_STATUS_TRANSITIONS: {
    [DispatchStatus.PENDING]: [
      DispatchStatus.ASSIGNED,
      DispatchStatus.CANCELLED,
    ],
    [DispatchStatus.ASSIGNED]: [
      DispatchStatus.IN_PROGRESS,
      DispatchStatus.CANCELLED,
      DispatchStatus.PENDING,
    ],
    [DispatchStatus.IN_PROGRESS]: [
      DispatchStatus.COMPLETED,
      DispatchStatus.CANCELLED,
    ],
    [DispatchStatus.COMPLETED]: [
      DispatchStatus.REOPENED,
    ],
    [DispatchStatus.CANCELLED]: [],
    [DispatchStatus.REOPENED]: [
      DispatchStatus.IN_PROGRESS,
      DispatchStatus.CANCELLED,
    ],
  },
};
