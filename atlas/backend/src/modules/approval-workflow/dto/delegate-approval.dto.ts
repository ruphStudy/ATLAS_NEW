import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class DelegateApprovalDto {
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class ReassignApprovalDto {
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
