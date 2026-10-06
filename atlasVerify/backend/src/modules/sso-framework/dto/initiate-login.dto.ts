import { IsEmail, IsOptional, IsString } from 'class-validator';

/** Public, unauthenticated — the visitor supplies an email address and the framework resolves the matching SSO connection by its domain (home-realm discovery). */
export class InitiateSsoLoginDto {
  @IsEmail()
  email: string;
}

export class SamlCallbackDto {
  @IsString()
  SAMLResponse: string;

  @IsString()
  @IsOptional()
  RelayState?: string;
}

export class OidcSsoCallbackDto {
  @IsString()
  code: string;

  @IsString()
  state: string;

  @IsString()
  @IsOptional()
  error?: string;
}
