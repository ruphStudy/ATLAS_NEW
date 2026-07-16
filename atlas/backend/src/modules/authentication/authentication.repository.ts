import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';

/**
 * AuthenticationRepository
 *
 * Handles auth-specific database operations:
 *   - Atomic workspace + user creation (registration)
 *   - Refresh token hash persistence
 *   - Last login timestamp update
 *
 * Rule: No business logic. Data access only.
 */
@Injectable()
export class AuthenticationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createUserWithWorkspace(params: {
    workspaceName: string;
    workspaceSlug: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: params.workspaceName,
          slug: params.workspaceSlug,
          status: 'ACTIVE',
          plan: 'FREE',
        },
      });

      return tx.user.create({
        data: {
          workspaceId: workspace.id,
          email: params.email,
          firstName: params.firstName,
          lastName: params.lastName,
          passwordHash: params.passwordHash,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });
    });
  }

  async updateRefreshToken(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
