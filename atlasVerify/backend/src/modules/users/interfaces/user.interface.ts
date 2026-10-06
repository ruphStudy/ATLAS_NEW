import type { UserRole, UserStatus } from '@prisma/client';

export interface IUserResponse {
  id: string;
  workspaceId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  timezone: string;
  locale: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserListResult {
  items: IUserResponse[];
  total: number;
  page: number;
  limit: number;
}
