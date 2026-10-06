import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RegisterPluginManifestDto {
  @IsString()
  @IsNotEmpty()
  versionId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredPermissions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredScopes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hooks?: string[];

  @IsObject()
  @IsOptional()
  configSchema?: Record<string, unknown>;

  /** Lower bound of ATLAS platform compatibility, e.g. '1.0.0'. */
  @IsString()
  @IsOptional()
  minAtlasVersion?: string;

  /** Upper bound of ATLAS platform compatibility, e.g. '2.0.0'. */
  @IsString()
  @IsOptional()
  maxAtlasVersion?: string;
}
