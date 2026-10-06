import { PutawayStatus } from '../interfaces';

export const PUTAWAY_CONSTANTS = {
  ALLOWED_STATUS_TRANSITIONS: {
    [PutawayStatus.PENDING]: [
      PutawayStatus.ASSIGNED,
      PutawayStatus.CANCELLED,
    ],
    [PutawayStatus.ASSIGNED]: [
      PutawayStatus.IN_PROGRESS,
      PutawayStatus.CANCELLED,
      PutawayStatus.PENDING,
    ],
    [PutawayStatus.IN_PROGRESS]: [
      PutawayStatus.COMPLETED,
      PutawayStatus.FAILED,
      PutawayStatus.CANCELLED,
    ],
    [PutawayStatus.COMPLETED]: [] as PutawayStatus[],
    [PutawayStatus.CANCELLED]: [] as PutawayStatus[],
    [PutawayStatus.FAILED]: [
      PutawayStatus.PENDING,
      PutawayStatus.ASSIGNED,
    ],
  },
};
