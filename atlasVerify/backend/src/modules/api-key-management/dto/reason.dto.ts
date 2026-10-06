import { IsOptional, IsString } from 'class-validator';

export class ApiKeyReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
