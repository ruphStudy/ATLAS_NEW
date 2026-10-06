import { IsArray, IsDateString, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateReceivingDto {
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsNumber()
  expectedQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  attachments?: unknown[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
