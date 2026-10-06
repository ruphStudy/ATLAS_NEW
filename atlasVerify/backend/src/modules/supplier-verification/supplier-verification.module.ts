import { Module } from '@nestjs/common';
import { SupplierVerificationController } from './supplier-verification.controller';
import { SupplierVerificationService } from './supplier-verification.service';
import { SupplierVerificationRepository } from './supplier-verification.repository';
import { VerificationQueue } from './jobs/verification.queue';
import { VerificationProcessor } from './jobs/verification.processor';
import { VerificationCheckRegistry } from './checks/check.registry';
import { BusinessRegistrationCheck } from './checks/business-registration.check';
import { GstVatCheck } from './checks/gst-vat.check';
import { ContactInfoCheck } from './checks/contact-info.check';
import { WebsiteAvailabilityCheck } from './checks/website-availability.check';
import { EmailValidityCheck } from './checks/email-validity.check';
import { PhoneValidityCheck } from './checks/phone-validity.check';
import { BusinessAgeCheck } from './checks/business-age.check';
import { ProductCatalogCheck } from './checks/product-catalog.check';
import { ProfileCompletenessCheck } from './checks/profile-completeness.check';

const ALL_CHECKS = [
  BusinessRegistrationCheck,
  GstVatCheck,
  ContactInfoCheck,
  WebsiteAvailabilityCheck,
  EmailValidityCheck,
  PhoneValidityCheck,
  BusinessAgeCheck,
  ProductCatalogCheck,
  ProfileCompletenessCheck,
];

@Module({
  controllers: [SupplierVerificationController],
  providers: [
    // Core
    SupplierVerificationService,
    SupplierVerificationRepository,

    // Queue + Worker
    VerificationQueue,
    VerificationProcessor,

    // All checks
    ...ALL_CHECKS,

    // Registry: add future checks to ALL_CHECKS array above — zero other changes
    {
      provide: VerificationCheckRegistry,
      useFactory: (...checks: InstanceType<typeof ALL_CHECKS[number]>[]) =>
        new VerificationCheckRegistry(checks),
      inject: ALL_CHECKS,
    },
  ],
  exports: [SupplierVerificationService],
})
export class SupplierVerificationModule {}
