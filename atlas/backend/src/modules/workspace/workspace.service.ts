import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@common/utils';
import { PaginationDto } from '@common/dto/pagination.dto';
import { OrganizationSettingsService } from '@modules/organization-settings/organization-settings.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { WorkspaceRepository } from './workspace.repository';
import { WorkspaceMembershipService } from './workspace-membership.service';
import { WorkspaceManagementEventQueue } from './jobs';
import { WORKSPACE_CONSTANTS, WORKSPACE_MANAGEMENT_MODULE, WORKSPACE_STATUS_ALLOWED_TRANSITIONS } from './constants';
import { WorkspaceManagementEvent } from './interfaces';
import type { IWorkspace, IWorkspaceListResult } from './interfaces';
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceResponseDto,
  SuspendWorkspaceDto,
  WorkspaceProfileResponseDto,
} from './dto';
import { WorkspaceInvalidStateTransitionException } from './exceptions/workspace.exceptions';

/**
 * WorkspaceService
 *
 * Business rules:
 *   - Slug is auto-generated from name + UUID suffix on creation (immutable).
 *   - Owner has full permissions. Members are checked via the users table.
 *   - Deletes are soft only.
 *   - Never exposes internal JSON fields (settings, metadata) in responses.
 */
@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly membershipService: WorkspaceMembershipService,
    private readonly organizationSettingsService: OrganizationSettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly eventQueue: WorkspaceManagementEventQueue,
  ) {}

  // ── Public Methods ───────────────────────────────────────────

  async create(dto: CreateWorkspaceDto, ownerId: string): Promise<WorkspaceResponseDto> {
    const slug = await this.generateUniqueSlug(dto.name);

    const workspace = await this.workspaceRepository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      ownerId,
      status: 'ACTIVE',
      plan: 'FREE',
    } as Prisma.WorkspaceUncheckedCreateInput);

    this.logger.log(`Workspace created: ${workspace.id} (${workspace.slug}) by ${ownerId}`);
    return this.toResponseDto(workspace);
  }

  async findAll(userId: string, pagination: PaginationDto): Promise<IWorkspaceListResult> {
    const [workspaces, total] = await this.workspaceRepository.findAllForUser(
      userId,
      pagination.skip,
      pagination.limit,
    );

    return {
      items: workspaces.map((w) => this.toResponseDto(w)) as unknown[],
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findById(id: string, userId: string): Promise<WorkspaceResponseDto> {
    const workspace = await this.getOrThrow(id);
    await this.assertAccess(workspace, userId);
    return this.toResponseDto(workspace);
  }

  async update(
    id: string,
    dto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.getOrThrow(id);
    await this.assertRole(workspace, userId, ['OWNER', 'ADMIN']);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name;
    if (dto.description !== undefined) data['description'] = dto.description;
    if (dto.logoUrl !== undefined) data['logoUrl'] = dto.logoUrl;
    if (dto.status !== undefined) data['status'] = dto.status;

    const updated = await this.workspaceRepository.update(id, data);
    return this.toResponseDto(updated);
  }

  async remove(id: string, userId: string, actingAsPlatformAdmin = false): Promise<void> {
    const workspace = await this.getOrThrow(id);
    if (!actingAsPlatformAdmin) {
      await this.assertRole(workspace, userId, ['OWNER']);
    }
    await this.workspaceRepository.softDelete(id);
    this.logger.log(`Workspace soft-deleted: ${id} by user ${userId}${actingAsPlatformAdmin ? ' (platform admin)' : ''}`);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  async activate(id: string, userId: string, actingAsPlatformAdmin = false): Promise<WorkspaceResponseDto> {
    return this.transition(id, userId, WorkspaceStatus.ACTIVE, WorkspaceManagementEvent.WORKSPACE_ACTIVATED, 'Activated', {
      suspendedAt: null,
      suspendedReason: null,
    }, actingAsPlatformAdmin);
  }

  async suspend(id: string, userId: string, dto: SuspendWorkspaceDto, actingAsPlatformAdmin = false): Promise<WorkspaceResponseDto> {
    return this.transition(id, userId, WorkspaceStatus.SUSPENDED, WorkspaceManagementEvent.WORKSPACE_SUSPENDED, 'Suspended', {
      suspendedAt: new Date(),
      suspendedReason: dto.reason ?? null,
    }, actingAsPlatformAdmin);
  }

  async archive(id: string, userId: string, actingAsPlatformAdmin = false): Promise<WorkspaceResponseDto> {
    return this.transition(id, userId, WorkspaceStatus.ARCHIVED, WorkspaceManagementEvent.WORKSPACE_ARCHIVED, 'Archived', {
      archivedAt: new Date(),
    }, actingAsPlatformAdmin);
  }

  async restore(id: string, userId: string, actingAsPlatformAdmin = false): Promise<WorkspaceResponseDto> {
    return this.transition(id, userId, WorkspaceStatus.ACTIVE, WorkspaceManagementEvent.WORKSPACE_RESTORED, 'Restored', {
      archivedAt: null,
    }, actingAsPlatformAdmin);
  }

  /**
   * Composes the base workspace record with its resolved regional/contact
   * settings — reused directly from the already-built Organization Settings
   * catalog (`organization.regional.*` / `organization.profile.*`), never
   * duplicated as new Workspace columns.
   */
  async getProfile(id: string, userId: string): Promise<WorkspaceProfileResponseDto> {
    const workspace = await this.getOrThrow(id);
    await this.membershipService.assertMember(workspace, userId);

    const [timezone, locale, currency, contactEmail, contactPhone] = await Promise.all([
      this.organizationSettingsService.resolveKey(id, userId, 'organization.regional.timezone'),
      this.organizationSettingsService.resolveKey(id, userId, 'organization.regional.locale'),
      this.organizationSettingsService.resolveKey(id, userId, 'organization.regional.currency'),
      this.organizationSettingsService.resolveKey(id, userId, 'organization.profile.contact-email').catch(() => null),
      this.organizationSettingsService.resolveKey(id, userId, 'organization.profile.contact-phone').catch(() => null),
    ]);

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logoUrl,
      status: workspace.status,
      plan: workspace.plan,
      organizationId: workspace.organizationId,
      onboardingStatus: workspace.onboardingStatus,
      timezone: (timezone.value as string) ?? 'UTC',
      locale: (locale.value as string) ?? 'en-US',
      currency: (currency.value as string) ?? 'USD',
      contactEmail: (contactEmail?.value as string) ?? null,
      contactPhone: (contactPhone?.value as string) ?? null,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────

  private async transition(
    id: string,
    userId: string,
    to: WorkspaceStatus,
    event: WorkspaceManagementEvent,
    reason: string,
    extraFields: Record<string, unknown>,
    actingAsPlatformAdmin = false,
  ): Promise<WorkspaceResponseDto> {
    const workspace = await this.getOrThrow(id);
    // Platform admins act on tenants they are not a member of — callers must have already passed
    // through `PlatformAdminGuard`/`AllowPlatformAdmin()` before reaching here; this only skips the
    // membership check, never the transition/audit/event machinery below.
    if (!actingAsPlatformAdmin) {
      await this.membershipService.assertAdmin(workspace, userId);
    }

    if (!WORKSPACE_STATUS_ALLOWED_TRANSITIONS[workspace.status]?.includes(to)) {
      throw new WorkspaceInvalidStateTransitionException(workspace.status, to);
    }

    const updated = await this.workspaceRepository.update(id, { status: to, ...extraFields });

    await this.auditLogsService.record({
      workspaceId: id,
      actorType: ActivityActorType.USER,
      actorId: userId,
      action: `workspace-management.workspace.${reason.toLowerCase()}`,
      actionCategory: AuditActionCategory.UPDATE,
      module: WORKSPACE_MANAGEMENT_MODULE,
      entityType: 'Workspace',
      entityId: id,
      outcome: ActivityOutcome.SUCCESS,
    });
    await this.activityCenterService.record({
      workspaceId: id,
      actorType: ActivityActorType.USER,
      actorId: userId,
      action: `workspace-management.workspace_${reason.toLowerCase()}`,
      sourceModule: WORKSPACE_MANAGEMENT_MODULE,
      entityType: 'Workspace',
      entityId: id,
      title: `Workspace ${reason.toLowerCase()}`,
      timelineId: id,
    });
    await this.eventQueue.publish({ event, workspaceId: id, actorId: userId });

    this.logger.log(`Workspace ${reason.toLowerCase()}: ${id} by ${userId}`);
    return this.toResponseDto(updated);
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    const suffix = (uuidv4().split('-')[0]) as string;
    const slug = `${base}-${suffix}`.slice(0, WORKSPACE_CONSTANTS.SLUG_MAX_LENGTH);

    const exists = await this.workspaceRepository.slugExists(slug);
    if (exists) return this.generateUniqueSlug(name);
    return slug;
  }

  private async getOrThrow(id: string): Promise<IWorkspace> {
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) throw new NotFoundException(`Workspace '${id}' not found`);
    return workspace;
  }

  private async assertAccess(workspace: IWorkspace, userId: string): Promise<void> {
    if (workspace.ownerId === userId) return;
    const member = await this.workspaceRepository.findUserInWorkspace(workspace.id, userId);
    if (!member) throw new ForbiddenException('You do not have access to this workspace');
  }

  private async assertRole(
    workspace: IWorkspace,
    userId: string,
    roles: string[],
  ): Promise<void> {
    if (workspace.ownerId === userId && roles.includes('OWNER')) return;
    const member = await this.workspaceRepository.findUserInWorkspace(workspace.id, userId);
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }
  }

  private toResponseDto(workspace: IWorkspace): WorkspaceResponseDto {
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logoUrl,
      ownerId: workspace.ownerId,
      status: workspace.status,
      plan: workspace.plan,
      organizationId: workspace.organizationId,
      onboardingStatus: workspace.onboardingStatus,
      archivedAt: workspace.archivedAt ? workspace.archivedAt.toISOString() : null,
      suspendedAt: workspace.suspendedAt ? workspace.suspendedAt.toISOString() : null,
      suspendedReason: workspace.suspendedReason,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }
}

