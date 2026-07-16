import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PaginationDto } from '@common/dto/pagination.dto';
import { UsersRepository } from './users.repository';
import { PRIVILEGED_ROLES } from './constants';
import type { IUserListResult, IUserResponse } from './interfaces';
import type { UpdateUserDto, UserResponseDto } from './dto';

/**
 * UsersService
 *
 * Rules:
 *   - All user business logic lives here.
 *   - Workspace isolation is enforced on every operation.
 *   - passwordHash and refreshTokenHash are never returned.
 *   - Role/status changes require OWNER or ADMIN.
 *   - Users cannot delete themselves.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  // ── Public Methods ───────────────────────────────────────────

  async findAll(workspaceId: string, pagination: PaginationDto): Promise<IUserListResult> {
    const [users, total] = await this.usersRepository.findAllByWorkspace(
      workspaceId,
      pagination.skip,
      pagination.limit,
    );

    return {
      items: users.map((u) => this.toResponseDto(u)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findById(id: string, workspaceId: string): Promise<UserResponseDto> {
    const user = await this.getInWorkspaceOrThrow(id, workspaceId);
    return this.toResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    requesterId: string,
    requesterRole: string,
    workspaceId: string,
  ): Promise<UserResponseDto> {
    await this.getInWorkspaceOrThrow(id, workspaceId);

    const isPrivileged = (PRIVILEGED_ROLES as readonly string[]).includes(requesterRole);
    const isSelf = id === requesterId;

    // Only self or privileged roles can update
    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only OWNER / ADMIN can change role or status
    if ((dto.role !== undefined || dto.status !== undefined) && !isPrivileged) {
      throw new ForbiddenException('Insufficient permissions to change role or status');
    }

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data['firstName'] = dto.firstName;
    if (dto.lastName !== undefined) data['lastName'] = dto.lastName;
    if (dto.phone !== undefined) data['phone'] = dto.phone;
    if (dto.avatarUrl !== undefined) data['avatarUrl'] = dto.avatarUrl;
    if (dto.timezone !== undefined) data['timezone'] = dto.timezone;
    if (dto.locale !== undefined) data['locale'] = dto.locale;
    if (dto.role !== undefined) data['role'] = dto.role;
    if (dto.status !== undefined) data['status'] = dto.status;

    const updated = await this.usersRepository.update(id, data);
    return this.toResponseDto(updated);
  }

  async remove(
    id: string,
    requesterId: string,
    requesterRole: string,
    workspaceId: string,
  ): Promise<void> {
    const target = await this.getInWorkspaceOrThrow(id, workspaceId);

    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    if (!(PRIVILEGED_ROLES as readonly string[]).includes(requesterRole)) {
      throw new ForbiddenException('Insufficient permissions to delete users');
    }

    // ADMIN cannot delete OWNER
    if (requesterRole === 'ADMIN' && target.role === 'OWNER') {
      throw new ForbiddenException('Administrators cannot delete workspace owners');
    }

    await this.usersRepository.softDelete(id);
    this.logger.log(`User soft-deleted: ${id} by requester ${requesterId}`);
  }

  // ── Legacy methods (used by AuthenticationModule) ────────────

  async findByIdOrNull(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  // ── Private Helpers ───────────────────────────────────────────

  private async getInWorkspaceOrThrow(id: string, workspaceId: string): Promise<User> {
    const user = await this.usersRepository.findByIdInWorkspace(id, workspaceId);
    if (!user) throw new NotFoundException(`User '${id}' not found in this workspace`);
    return user;
  }

  private toResponseDto(user: User): IUserResponse {
    return {
      id: user.id,
      workspaceId: user.workspaceId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      status: user.status,
      timezone: user.timezone,
      locale: user.locale,
      emailVerified: user.emailVerifiedAt !== null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

