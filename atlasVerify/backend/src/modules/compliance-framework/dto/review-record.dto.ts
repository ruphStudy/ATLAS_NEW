import { IsIn, IsString, IsOptional } from 'class-validator';

export class ReviewComplianceRecordDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  reason?: string;
}
