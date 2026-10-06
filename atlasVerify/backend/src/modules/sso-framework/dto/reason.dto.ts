import { IsOptional, IsString } from 'class-validator';

export class SsoReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
