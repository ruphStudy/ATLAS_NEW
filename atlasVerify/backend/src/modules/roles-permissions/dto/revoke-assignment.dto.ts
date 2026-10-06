import { IsString, IsOptional } from 'class-validator';

export class RevokeAssignmentDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
