import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';

export class StartApprovalRequestDto {
  @IsString()
  @IsNotEmpty()
  definitionKey: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  riskLevel?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
