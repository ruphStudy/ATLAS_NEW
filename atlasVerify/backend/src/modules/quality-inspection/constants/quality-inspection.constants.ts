import {
  QualityInspectionStatus,
  InspectionRecommendation,
} from '../interfaces';

export const INSPECTION_CONSTANTS = {
  NUMBER_PREFIX: 'QI',
  NUMBER_PAD_LENGTH: 6,

  EVENTS: {
    CREATED: 'inspection.created',
    STARTED: 'inspection.started',
    COMPLETED: 'inspection.completed',
    PASSED: 'inspection.passed',
    FAILED: 'inspection.failed',
    CLOSED: 'inspection.closed',
  },

  // Minimum quality score to auto-pass
  PASS_THRESHOLD: 70,

  // Status transitions
  ALLOWED_TRANSITIONS: {
    [QualityInspectionStatus.PENDING]: [
      QualityInspectionStatus.SCHEDULED,
      QualityInspectionStatus.IN_PROGRESS,
    ],
    [QualityInspectionStatus.SCHEDULED]: [
      QualityInspectionStatus.IN_PROGRESS,
      QualityInspectionStatus.PENDING,
    ],
    [QualityInspectionStatus.IN_PROGRESS]: [
      QualityInspectionStatus.PASSED,
      QualityInspectionStatus.FAILED,
      QualityInspectionStatus.CONDITIONAL_APPROVAL,
    ],
    [QualityInspectionStatus.PASSED]: [QualityInspectionStatus.CLOSED],
    [QualityInspectionStatus.FAILED]: [
      QualityInspectionStatus.REJECTED,
      QualityInspectionStatus.CLOSED,
    ],
    [QualityInspectionStatus.CONDITIONAL_APPROVAL]: [
      QualityInspectionStatus.CLOSED,
      QualityInspectionStatus.REJECTED,
    ],
    [QualityInspectionStatus.REJECTED]: [QualityInspectionStatus.CLOSED],
    [QualityInspectionStatus.CLOSED]: [],
  } as Record<QualityInspectionStatus, QualityInspectionStatus[]>,

  RECOMMENDATION_MAP: {
    [QualityInspectionStatus.PASSED]: InspectionRecommendation.APPROVE,
    [QualityInspectionStatus.FAILED]: InspectionRecommendation.REJECT,
    [QualityInspectionStatus.CONDITIONAL_APPROVAL]:
      InspectionRecommendation.CONDITIONALLY_APPROVE,
    [QualityInspectionStatus.REJECTED]: InspectionRecommendation.REJECT,
  } as Partial<Record<QualityInspectionStatus, InspectionRecommendation>>,
} as const;

export const INSPECTION_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const INSPECTION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  inspectionDate: 'inspectionDate',
  scheduledDate: 'scheduledDate',
  qualityScore: 'qualityScore',
  quantityInspected: 'quantityInspected',
  inspectionNumber: 'inspectionNumber',
};
