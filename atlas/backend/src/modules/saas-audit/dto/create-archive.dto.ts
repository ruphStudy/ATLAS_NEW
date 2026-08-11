import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAuditArchiveDto {
  /** Omit for a platform-wide, cross-tenant archive batch. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  fromDate: string;

  @IsString()
  @IsNotEmpty()
  toDate: string;
}
