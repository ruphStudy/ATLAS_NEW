import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { PermissionEffect } from '../interfaces';

export class GrantPermissionDto {
  @IsString()
  @IsNotEmpty()
  permissionKey!: string;

  @IsEnum(PermissionEffect)
  @IsOptional()
  effect?: PermissionEffect;

  @IsObject()
  @IsOptional()
  constraints?: Record<string, unknown>;
}
