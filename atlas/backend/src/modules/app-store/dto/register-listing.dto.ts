import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AppPricingModel, AppPublisherType } from '../interfaces';

export class RegisterAppListingDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsEnum(AppPublisherType)
  publisherType!: AppPublisherType;

  @IsString()
  @IsOptional()
  publisherName?: string;

  @IsString()
  @IsOptional()
  publisherId?: string;

  /** Required for PRIVATE apps — the single org this listing is visible to. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(AppPricingModel)
  pricingModel!: AppPricingModel;

  /** `Plan.code` (Plan Management) this app is entitlement-gated by, if any. */
  @IsString()
  @IsOptional()
  planKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @IsString()
  @IsOptional()
  featureFlagKey?: string;

  /** The initial version to create alongside the listing (DRAFT). */
  @IsString()
  @IsNotEmpty()
  initialVersion!: string;
}
