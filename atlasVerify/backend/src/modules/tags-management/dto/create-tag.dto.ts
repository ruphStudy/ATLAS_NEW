import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { TagScope, TagManagedBy } from '../interfaces';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TagScope)
  @IsOptional()
  scope?: TagScope;

  /** Required when scope is ORGANIZATION. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required when scope is MODULE. */
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  /** Only OWNER/ADMIN (or an equivalent granular role) may create SYSTEM-managed tags. */
  @IsEnum(TagManagedBy)
  @IsOptional()
  managedBy?: TagManagedBy;
}
