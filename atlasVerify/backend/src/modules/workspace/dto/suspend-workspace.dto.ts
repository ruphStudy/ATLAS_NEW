import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendWorkspaceDto {
  @ApiPropertyOptional({ example: 'Payment failure — resolve billing to reactivate' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
