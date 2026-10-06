export const VERIFICATION_CONSTANTS = {
  QUEUE_NAME: 'supplier-verification',
  JOB_NAME: 'run-supplier-verification',
  DEFAULT_SCORE_THRESHOLD: 70,
  REVIEW_REQUIRED_BUFFER: 20, // threshold - 20 = review_required boundary
  WORKER_CONCURRENCY: 3,
} as const;

export const CHECK_NAMES = {
  BUSINESS_REGISTRATION: 'business_registration',
  GST_VAT: 'gst_vat',
  CONTACT_INFO: 'contact_info',
  WEBSITE_AVAILABILITY: 'website_availability',
  EMAIL_VALIDITY: 'email_validity',
  PHONE_VALIDITY: 'phone_validity',
  BUSINESS_AGE: 'business_age',
  PRODUCT_CATALOG: 'product_catalog',
  PROFILE_COMPLETENESS: 'profile_completeness',
} as const;

export type CheckName = (typeof CHECK_NAMES)[keyof typeof CHECK_NAMES];
