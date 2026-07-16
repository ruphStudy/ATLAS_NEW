import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@common/utils';
import { PaginationDto } from '@common/dto/pagination.dto';
import { WorkspaceRepository } from './workspace.repository';
import { WORKSPACE_CONSTANTS } from './constants';
import type { IWorkspace, IWorkspaceListResult } from './interfaces';
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceResponseDto,
} from './dto';

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

  constructor(private readonly workspaceRepository: WorkspaceRepository) {}

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

  async remove(id: string, userId: string): Promise<void> {
    const workspace = await this.getOrThrow(id);
    await this.assertRole(workspace, userId, ['OWNER']);
    await this.workspaceRepository.softDelete(id);
    this.logger.log(`Workspace soft-deleted: ${id} by user ${userId}`);
  }

  // ── Private Helpers ───────────────────────────────────────────

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
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }
}

