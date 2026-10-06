import { IsString, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Pass null to detach from its current parent. */
  @IsString()
  @IsOptional()
  parentRoleId?: string | null;
}
