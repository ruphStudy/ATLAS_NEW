import { IsNotEmpty, IsString } from 'class-validator';

/** The new OIDC client secret as re-rolled on the IdP's side — ATLAS never generates one itself. */
export class RotateSsoClientSecretDto {
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
