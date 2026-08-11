import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { PermissionResolverService } from '../permission-resolver.service';
import { IRolesPermissionsEventPayload, RolesPermissionsEvent } from '../interfaces';

/**
 * RolesPermissionsEventWorker — the event-driven half of cache invalidation
 * (the service already invalidates synchronously in-process on write, so
 * the very next check in the same request is always consistent; this
 * worker additionally consumes the published event so any other consumer
 * of `PermissionResolverService` in this process stays in sync too).
 */
@Processor(QUEUE_NAMES.ROLES_PERMISSIONS_EVENTS)
export class RolesPermissionsEventWorker extends WorkerHost {
  private readonly logger = new Logger(RolesPermissionsEventWorker.name);

  constructor(private readonly permissionResolver: PermissionResolverService) {
    super();
  }

  async process(job: Job<IRolesPermissionsEventPayload>): Promise<void> {
    const { event, workspaceId, roleId } = job.data;
    this.logger.debug(`${event}: role ${roleId ?? 'n/a'} for workspace ${workspaceId ?? 'n/a'}`);

    switch (event) {
      case RolesPermissionsEvent.PERMISSION_GRANTED:
      case RolesPermissionsEvent.PERMISSION_DENIED_GRANT:
      case RolesPermissionsEvent.PERMISSION_REVOKED:
      case RolesPermissionsEvent.ROLE_UPDATED:
      case RolesPermissionsEvent.ROLE_ARCHIVED:
        // Role/permission-set changes can affect every principal holding the role (directly or via
        // inheritance) — a targeted invalidation would need to walk all assignments, so this clears
        // the whole cache, same trade-off the Settings Framework makes for GLOBAL-scope writes.
        this.permissionResolver.invalidateAll();
        break;
      default:
        break;
    }
  }
}
