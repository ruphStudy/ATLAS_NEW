import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_CHANGES'])
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

  @IsString()
  @IsOptional()
  comment?: string;
}
