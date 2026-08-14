import { IsString, IsOptional, IsDateString } from 'class-validator';

export class SubmitComplianceEvidenceDto {
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsDateString()
  @IsOptional()
  issuedAt?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  /** An existing Document Management `Document.id` carrying the evidence file. */
  @IsString()
  @IsOptional()
  evidenceDocumentId?: string;
}
