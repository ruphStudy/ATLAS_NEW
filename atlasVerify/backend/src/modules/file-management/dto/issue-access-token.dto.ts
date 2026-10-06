import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FileAccessPurpose } from '../interfaces';

export class IssueAccessTokenDto {
  @IsEnum(FileAccessPurpose)
  @IsOptional()
  purpose?: FileAccessPurpose;

  /** Overrides the configured default access-token TTL, in milliseconds. */
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @IsOptional()
  ttlMs?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;
}
