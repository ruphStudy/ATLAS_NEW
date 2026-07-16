import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceRepository } from './workspace.repository';

/**
 * WorkspaceModule
 *
 * Responsibilities:
 *   - Workspace CRUD (create, read, update)
 *   - Workspace settings management
 *   - Member management within a workspace
 *   - Plan / subscription association
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceRepository],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
