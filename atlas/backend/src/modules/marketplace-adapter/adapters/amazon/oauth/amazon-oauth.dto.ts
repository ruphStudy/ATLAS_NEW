import { IsOptional, IsString, MaxLength } from 'class-validator';

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

/**
 * Login URI continuation. The amazon_* / selling_partner_id / version fields
 * are forwarded verbatim from Amazon's Login URI query string; workspaceId and
 * userId are never accepted here — they come from the authenticated session.
 */
export class ContinueAmazonLoginUriDto {
  @IsString()
  @MaxLength(2048)
  amazonCallbackUri!: string;

  @IsString()
  @MaxLength(2048)
  amazonState!: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  sellingPartnerId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  version?: string;

  /** The state from this user's own Connect Amazon action, if the browser still has it. */
  @IsString()
  @IsOptional()
  @MaxLength(4096)
  pendingState?: string;

  /** Required only when no valid pendingState is available. */
  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  accountId?: string;
}

export class ContinueAmazonLoginUriResponseDto {
  redirectUrl!: string;
  expiresAt!: Date;
}
