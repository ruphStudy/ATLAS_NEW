import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  /** Present when the provider itself rejected the request before issuing a code — surfaced back as a failed authorization request rather than attempting an exchange. */
  @IsString()
  @IsOptional()
  error?: string;
}
