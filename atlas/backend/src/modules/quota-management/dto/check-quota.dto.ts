import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CheckQuotaDto {
  @IsString()
  @IsNotEmpty()
  resourceKey: string;

  @IsString()
  @IsOptional()
  feature?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  requestedQuantity?: number;
}
