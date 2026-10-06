import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateGroupRoleMappingDto {
  @IsString()
  @IsNotEmpty()
  externalGroup!: string;

  /** `Role.id` (Roles & Permissions) — admin-selected, not resolved by key at runtime. */
  @IsString()
  @IsNotEmpty()
  roleId!: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;
}

export class UpdateGroupRoleMappingDto {
  @IsString()
  @IsOptional()
  roleId?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  priority?: number;
}
