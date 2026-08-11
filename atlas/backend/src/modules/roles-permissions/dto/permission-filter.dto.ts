import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PermissionAction, PermissionScope } from '../interfaces';

export class PermissionFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  @IsEnum(PermissionAction)
  @IsOptional()
  action?: PermissionAction;

  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
