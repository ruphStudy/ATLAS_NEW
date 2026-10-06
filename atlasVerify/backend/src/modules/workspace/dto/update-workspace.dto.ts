import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { WorkspaceStatus } from '@prisma/client';
import { CreateWorkspaceDto } from './create-workspace.dto';

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {
  @ApiPropertyOptional({
    enum: WorkspaceStatus,
    example: WorkspaceStatus.ACTIVE,
    description: 'Workspace status (OWNER only)',
  })
  @IsOptional()
  @IsEnum(WorkspaceStatus, { message: 'status must be a valid WorkspaceStatus' })
  status?: WorkspaceStatus;
}
