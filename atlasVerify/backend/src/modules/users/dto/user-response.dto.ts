import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string = '';

  @ApiProperty({ example: 'workspace-uuid' })
  workspaceId: string = '';

  @ApiProperty({ example: 'john@acmecorp.com' })
  email: string = '';

  @ApiProperty({ example: 'John' })
  firstName: string = '';

  @ApiProperty({ example: 'Doe' })
  lastName: string = '';

  @ApiPropertyOptional({ example: '+14155552671', nullable: true })
  phone: string | null = null;

  @ApiPropertyOptional({ example: 'https://cdn.acme.com/avatars/john.jpg', nullable: true })
  avatarUrl: string | null = null;

  @ApiProperty({ enum: UserRole, example: UserRole.OWNER })
  role: UserRole = UserRole.VIEWER;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus = UserStatus.ACTIVE;

  @ApiProperty({ example: 'America/New_York' })
  timezone: string = 'UTC';

  @ApiProperty({ example: 'en-US' })
  locale: string = 'en-US';

  @ApiProperty({
    example: true,
    description: 'True if the user has verified their email address',
  })
  emailVerified: boolean = false;

  @ApiPropertyOptional({ example: '2026-07-14T10:00:00.000Z', nullable: true })
  lastLoginAt: string | null = null;

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  updatedAt: string = '';
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items: UserResponseDto[] = [];

  @ApiProperty({ example: 5 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 20 })
  limit: number = 20;
}
