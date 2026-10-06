import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WorkspaceMemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: WorkspaceMemberRole, example: 'ADMIN' })
  @IsEnum(WorkspaceMemberRole)
  role!: WorkspaceMemberRole;
}
