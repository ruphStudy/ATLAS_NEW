import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateTagDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Pass null to detach from its current group. */
  @IsString()
  @IsOptional()
  groupId?: string | null;

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
}
