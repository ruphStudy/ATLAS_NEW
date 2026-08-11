import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AppStoreReasonDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class AppStoreRequiredReasonDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
