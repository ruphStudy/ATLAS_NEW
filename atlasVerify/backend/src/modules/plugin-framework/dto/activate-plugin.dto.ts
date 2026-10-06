import { IsArray, IsOptional, IsString } from 'class-validator';

export class ActivatePluginDto {
  /** Subset of the manifest's `requiredPermissions` this tenant approves — defaults to the full manifest set when omitted. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  grantedPermissions?: string[];
}
