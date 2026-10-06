import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspaceMemberRole, WorkspaceMemberStatus, WorkspaceInvitationStatus } from '@prisma/client';

export class WorkspaceMemberResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() workspaceId: string = '';
  @ApiProperty() userId: string = '';
  @ApiProperty({ enum: WorkspaceMemberRole }) role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER;
  @ApiProperty({ enum: WorkspaceMemberStatus }) status: WorkspaceMemberStatus = WorkspaceMemberStatus.ACTIVE;
  @ApiPropertyOptional({ nullable: true }) invitedBy: string | null = null;
  @ApiProperty() joinedAt: string = '';
  @ApiPropertyOptional({ nullable: true }) removedAt: string | null = null;
}

export class PaginatedWorkspaceMemberResponseDto {
  @ApiProperty({ type: [WorkspaceMemberResponseDto] }) items: WorkspaceMemberResponseDto[] = [];
  @ApiProperty() total: number = 0;
  @ApiProperty() page: number = 1;
  @ApiProperty() limit: number = 20;
}

export class WorkspaceInvitationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() workspaceId: string = '';
  @ApiProperty() email: string = '';
  @ApiProperty({ enum: WorkspaceMemberRole }) role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER;
  @ApiProperty({ enum: WorkspaceInvitationStatus }) status: WorkspaceInvitationStatus = WorkspaceInvitationStatus.PENDING;
  @ApiProperty() invitedBy: string = '';
  @ApiProperty() expiresAt: string = '';
  @ApiPropertyOptional({ nullable: true }) acceptedAt: string | null = null;
}

export class PaginatedWorkspaceInvitationResponseDto {
  @ApiProperty({ type: [WorkspaceInvitationResponseDto] }) items: WorkspaceInvitationResponseDto[] = [];
  @ApiProperty() total: number = 0;
  @ApiProperty() page: number = 1;
  @ApiProperty() limit: number = 20;
}

export class WorkspaceProfileResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() name: string = '';
  @ApiProperty() slug: string = '';
  @ApiPropertyOptional({ nullable: true }) description: string | null = null;
  @ApiPropertyOptional({ nullable: true }) logoUrl: string | null = null;
  @ApiProperty() status: string = '';
  @ApiProperty() plan: string = '';
  @ApiPropertyOptional({ nullable: true }) organizationId: string | null = null;
  @ApiProperty() onboardingStatus: string = '';
  /** Resolved through the existing Organization Settings catalog (`organization.profile.*` / `organization.regional.*`) — never duplicated here. */
  @ApiProperty() timezone: string = 'UTC';
  @ApiProperty() locale: string = 'en-US';
  @ApiProperty() currency: string = 'USD';
  @ApiPropertyOptional({ nullable: true }) contactEmail: string | null = null;
  @ApiPropertyOptional({ nullable: true }) contactPhone: string | null = null;
}
