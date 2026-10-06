import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkspacePlan, WorkspaceStatus } from '@prisma/client';

export class WorkspaceResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string = '';

  @ApiProperty({ example: 'Acme Corp' })
  name: string = '';

  @ApiProperty({ example: 'acme-corp-a1b2c3d4' })
  slug: string = '';

  @ApiPropertyOptional({ example: 'Our primary commerce workspace', nullable: true })
  description: string | null = null;

  @ApiPropertyOptional({ example: 'https://cdn.acme.com/logo.png', nullable: true })
  logoUrl: string | null = null;

  @ApiPropertyOptional({ example: 'user-uuid', nullable: true })
  ownerId: string | null = null;

  @ApiProperty({ enum: WorkspaceStatus, example: WorkspaceStatus.ACTIVE })
  status: WorkspaceStatus = WorkspaceStatus.ACTIVE;

  @ApiProperty({ enum: WorkspacePlan, example: WorkspacePlan.FREE })
  plan: WorkspacePlan = WorkspacePlan.FREE;

  @ApiPropertyOptional({ example: null, nullable: true, description: 'Forward-compatible reference only — no Organization module implemented yet' })
  organizationId: string | null = null;

  @ApiPropertyOptional({ example: 'NOT_STARTED' })
  onboardingStatus?: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  archivedAt: string | null = null;

  @ApiPropertyOptional({ example: null, nullable: true })
  suspendedAt: string | null = null;

  @ApiPropertyOptional({ example: null, nullable: true })
  suspendedReason: string | null = null;

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2026-07-14T10:00:00.000Z' })
  updatedAt: string = '';
}

export class WorkspaceListResponseDto {
  @ApiProperty({ type: [WorkspaceResponseDto] })
  items: WorkspaceResponseDto[] = [];

  @ApiProperty({ example: 1 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 20 })
  limit: number = 20;
}
