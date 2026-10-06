import { PickingStatus } from '../interfaces';

export const PICKING_CONSTANTS = {
  ALLOWED_STATUS_TRANSITIONS: {
    [PickingStatus.PENDING]: [
      PickingStatus.ASSIGNED,
      PickingStatus.RELEASED,
      PickingStatus.CANCELLED,
    ],
    [PickingStatus.ASSIGNED]: [
      PickingStatus.RELEASED,
      PickingStatus.CANCELLED,
      PickingStatus.PENDING,
    ],
    [PickingStatus.RELEASED]: [
      PickingStatus.IN_PROGRESS,
      PickingStatus.CANCELLED,
    ],
    [PickingStatus.IN_PROGRESS]: [
      PickingStatus.PAUSED,
      PickingStatus.COMPLETED,
      PickingStatus.FAILED,
      PickingStatus.CANCELLED,
    ],
    [PickingStatus.PAUSED]: [
      PickingStatus.IN_PROGRESS,
      PickingStatus.CANCELLED,
    ],
    [PickingStatus.COMPLETED]: [] as PickingStatus[],
    [PickingStatus.CANCELLED]: [] as PickingStatus[],
    [PickingStatus.FAILED]: [
      PickingStatus.PENDING,
      PickingStatus.ASSIGNED,
    ],
  },
};
