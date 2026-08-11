import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { RoleType } from '../interfaces';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "regional-manager")',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Only WORKSPACE/ORGANIZATION/CUSTOM may be created via the API — SYSTEM roles are bootstrap-only. */
  @IsEnum(RoleType)
  type: RoleType;

  @IsString()
  @IsOptional()
  parentRoleId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;
}
