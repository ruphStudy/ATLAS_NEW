import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { PermissionAction, PermissionScope } from '../interfaces';

export class CreatePermissionDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(\.[a-z0-9-]+)*$/, {
    message: 'key must be a lowercase dot-separated identifier (e.g. "inventory.item.approve")',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  module: string;

  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsEnum(PermissionAction)
  action: PermissionAction;

  @IsEnum(PermissionScope)
  scope: PermissionScope;

  @IsString()
  @IsOptional()
  description?: string;
}
