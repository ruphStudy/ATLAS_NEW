import { IsOptional, IsString } from 'class-validator';

export class OAuthReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
