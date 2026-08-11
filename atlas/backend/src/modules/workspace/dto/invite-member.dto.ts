import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { WorkspaceMemberRole } from '@prisma/client';
import { INVITABLE_MEMBER_ROLES } from '../constants';

export class InviteMemberDto {
  @ApiProperty({ example: 'teammate@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: INVITABLE_MEMBER_ROLES, example: 'MEMBER' })
  @IsEnum(WorkspaceMemberRole, { message: `role must be one of ${INVITABLE_MEMBER_ROLES.join(', ')}` })
  role!: WorkspaceMemberRole;
}
