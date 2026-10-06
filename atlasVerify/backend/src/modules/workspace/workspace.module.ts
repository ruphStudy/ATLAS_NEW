import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { UsersModule } from '@modules/users/users.module';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { OrganizationSettingsModule } from '@modules/organization-settings/organization-settings.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { ActivityCenterModule } from '@modules/activity-center/activity-center.module';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { WorkspaceMembershipService } from './workspace-membership.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceManagementEventQueue, WorkspaceManagementEventWorker } from './jobs';

/**
 * WorkspaceModule — Workspace Management: CRUD, lifecycle (activate/
 * suspend/archive/restore), membership/invitations, ownership transfer,
 * workspace switching, and a profile view composed from the existing
 * Organization Settings catalog. Business profile/timezone/locale/currency
 * storage is never duplicated here — it already lives in
 * `OrganizationSettingsModule`. A user's legacy home workspace
 * (`User.workspaceId`) and the pre-existing CRUD methods below are
 * untouched, so existing workspace data and behavior keep working exactly
 * as before; membership/invitations are purely additive.
 */
@Module({
  imports: [
    UsersModule,
    AuthenticationModule,
    RolesPermissionsModule,
    OrganizationSettingsModule,
    AuditLogsModule,
    ActivityCenterModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.WORKSPACE_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    WorkspaceMembershipService,
    WorkspaceRepository,
    WorkspaceManagementEventQueue,
    WorkspaceManagementEventWorker,
  ],
  exports: [WorkspaceService, WorkspaceMembershipService, WorkspaceRepository],
})
export class WorkspaceModule {}
