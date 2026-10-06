import { IsNotEmpty, IsString } from 'class-validator';

/** The new secret as regenerated on the PROVIDER's side (e.g. re-rolled in the Google/Slack/QuickBooks app console) — ATLAS never invents an OAuth client secret itself, it only stores whatever the provider issued. */
export class RotateClientSecretDto {
  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}
