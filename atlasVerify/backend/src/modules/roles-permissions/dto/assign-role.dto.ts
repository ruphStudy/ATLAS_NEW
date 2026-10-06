import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PrincipalType, AssignmentScopeType } from '../interfaces';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsEnum(PrincipalType)
  principalType: PrincipalType;

  @IsString()
  @IsNotEmpty()
  principalId: string;

  @IsEnum(AssignmentScopeType)
  @IsOptional()
  scopeType?: AssignmentScopeType;

  /** Required when scopeType is MARKETPLACE, WAREHOUSE or ENTITY. */
  @IsString()
  @IsOptional()
  scopeId?: string;

  /** Omit for a permanent assignment — set both for a temporary/time-boxed role. */
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
