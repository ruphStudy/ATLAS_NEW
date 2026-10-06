import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMaintenanceWindowDto {
  /** Omit for a platform-wide window. */
  @IsString()
  @IsOptional()
  workspaceId?: string;

  /** Omit to suppress evaluation for every monitored module in scope. */
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  startAt!: string;

  @IsString()
  @IsNotEmpty()
  endAt!: string;
}
