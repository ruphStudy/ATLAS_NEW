import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierManagementStatus } from '../constants';
import type {
  SupplierAddress,
  SupplierCertification,
  SupplierContactPerson,
  SupplierBusinessRegistration,
  SupplierTaxIdentifier,
  SupplierPaymentTerms,
  SupplierShippingTerms,
} from '../interfaces';

export class SupplierResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() workspaceId!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() legalName?: string | null;
  @ApiProperty() provider!: string;
  @ApiPropertyOptional() providerSupplierId?: string | null;
  @ApiProperty({ enum: SupplierManagementStatus }) status!: SupplierManagementStatus;
  @ApiProperty() tier!: string;
  @ApiProperty() country!: string;
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() website?: string | null;
  @ApiPropertyOptional() contactEmail?: string | null;
  @ApiPropertyOptional() contactPhone?: string | null;
  @ApiPropertyOptional({ type: [Object] }) addresses?: SupplierAddress[] | null;
  @ApiPropertyOptional({ type: [Object] }) contactPersons?: SupplierContactPerson[] | null;
  @ApiPropertyOptional({ type: Object }) businessRegistration?: SupplierBusinessRegistration | null;
  @ApiPropertyOptional({ type: [Object] }) taxIdentifiers?: SupplierTaxIdentifier[] | null;
  @ApiProperty({ type: [String] }) categories!: string[];
  @ApiPropertyOptional() minOrderQuantity?: number | null;
  @ApiPropertyOptional() avgLeadTimeDays?: number | null;
  @ApiPropertyOptional({ type: Object }) paymentTerms?: SupplierPaymentTerms | null;
  @ApiPropertyOptional({ type: Object }) shippingTerms?: SupplierShippingTerms | null;
  @ApiPropertyOptional({ type: [Object] }) certifications?: SupplierCertification[] | null;
  @ApiPropertyOptional() overallRating?: number | null;
  @ApiPropertyOptional({ description: 'Verification score 0–100' }) verificationScore?: number | null;
  @ApiPropertyOptional() verificationStatus?: string | null;
  @ApiPropertyOptional({ description: 'Risk score 0–100' }) riskScore?: number | null;
  @ApiPropertyOptional({ description: 'Performance score 0–100' }) performanceScore?: number | null;
  @ApiPropertyOptional({ type: [String] }) tags?: string[] | null;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional() deletedAt?: Date | null;
}

export class SupplierListResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] }) items!: SupplierResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

export class SupplierStatusHistoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() supplierId!: string;
  @ApiPropertyOptional() previousStatus?: string | null;
  @ApiProperty() newStatus!: string;
  @ApiPropertyOptional() reason?: string | null;
  @ApiPropertyOptional() changedBy?: string | null;
  @ApiProperty() createdAt!: Date;
}
