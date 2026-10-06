import { IsOptional, IsString } from 'class-validator';

export class StartAmazonAuthorizationDto {
  /** ISO country code identifying which Amazon marketplace to connect (e.g. 'US', 'IN', 'UK'). */
  @IsString()
  country!: string;

  /** Present only when reconnecting an existing MarketplaceAccount. */
  @IsString()
  @IsOptional()
  accountId?: string;
}

export class AmazonAuthorizeResponseDto {
  authorizationUrl!: string;
  expiresAt!: Date;
}

/** Query params Amazon appends to the registered redirect_uri. Field names match Amazon's own SP-API OAuth callback contract. */
export class AmazonOAuthCallbackQueryDto {
  @IsString()
  state!: string;

  @IsString()
  @IsOptional()
  spapi_oauth_code?: string;

  @IsString()
  @IsOptional()
  selling_partner_id?: string;

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  error_description?: string;
}
