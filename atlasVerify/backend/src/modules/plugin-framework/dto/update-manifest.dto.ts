import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdatePluginManifestDto {
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

  @IsString()
  @IsOptional()
  minAtlasVersion?: string;

  @IsString()
  @IsOptional()
  maxAtlasVersion?: string;
}
