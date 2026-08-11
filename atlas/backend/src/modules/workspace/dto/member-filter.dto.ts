import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { WorkspaceMemberRole, WorkspaceMemberStatus } from '@prisma/client';

export class MemberFilterDto {
  @ApiPropertyOptional({ enum: WorkspaceMemberRole })
  @IsOptional()
  @IsEnum(WorkspaceMemberRole)
  role?: WorkspaceMemberRole;

  @ApiPropertyOptional({ enum: WorkspaceMemberStatus })
  @IsOptional()
  @IsEnum(WorkspaceMemberStatus)
  status?: WorkspaceMemberStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
