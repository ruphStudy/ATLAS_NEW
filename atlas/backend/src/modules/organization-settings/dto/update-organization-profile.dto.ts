import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class UpdateOrganizationProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsArray()
  @IsOptional()
  addresses?: Record<string, unknown>[];

  @IsObject()
  @IsOptional()
  taxIdentifiers?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
