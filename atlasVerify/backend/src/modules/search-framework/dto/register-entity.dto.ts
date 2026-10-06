import { IsString, IsNotEmpty, IsOptional, IsArray, Matches } from 'class-validator';

export class RegisterSearchEntityDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "procurement-purchase-order")',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  searchableFields?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  facetFields?: string[];

  /** Legacy roles allowed to see this entity type in search results — empty/omitted means visible to everyone. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredRoles?: string[];

  /** A Roles & Permissions catalog key — holders of this permission may also see this entity type. */
  @IsString()
  @IsOptional()
  requiredPermissionKey?: string;
}
