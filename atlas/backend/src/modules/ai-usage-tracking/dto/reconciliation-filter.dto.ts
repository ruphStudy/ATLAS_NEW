import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ReconciliationFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
