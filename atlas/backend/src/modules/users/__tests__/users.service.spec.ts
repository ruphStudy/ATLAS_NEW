import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const OWNER_ID = 'owner-uuid';
const ADMIN_ID = 'admin-uuid';
const VIEWER_ID = 'viewer-uuid';
const TARGET_ID = 'target-uuid';

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: TARGET_ID,
    workspaceId: WS_ID,
    email: 'target@acme.com',
    firstName: 'Target',
    lastName: 'User',
    phone: null,
    avatarUrl: null,
    role: UserRole.VIEWER,
    status: UserStatus.ACTIVE,
    timezone: 'UTC',
    locale: 'en-US',
    passwordHash: '$2b$12$hashed',
    refreshTokenHash: null,
    emailVerifiedAt: null,
    lastLoginAt: null,
    metadata: {},
    createdAt: new Date('2026-07-14T10:00:00.000Z'),
    updatedAt: new Date('2026-07-14T10:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

const MOCK_USER = buildUser();
const MOCK_ADMIN_USER = buildUser({ id: ADMIN_ID, role: UserRole.ADMIN });

// ── Test Suite ────────────────────────────────────────────────
describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            findByIdInWorkspace: jest.fn(),
            findByEmail: jest.fn(),
            findAllByWorkspace: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated user list for workspace', async () => {
      repo.findAllByWorkspace.mockResolvedValue([[MOCK_USER as never], 1]);
      const pagination = { page: 1, limit: 20, skip: 0, sortOrder: 'desc' as const };

      const result = await service.findAll(WS_ID, pagination as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should not expose passwordHash or refreshTokenHash', async () => {
      repo.findAllByWorkspace.mockResolvedValue([[MOCK_USER as never], 1]);
      const pagination = { page: 1, limit: 20, skip: 0 };

      const result = await service.findAll(WS_ID, pagination as never);

      expect(result.items[0]).not.toHaveProperty('passwordHash');
      expect(result.items[0]).not.toHaveProperty('refreshTokenHash');
    });

    it('should return emailVerified as boolean', async () => {
      repo.findAllByWorkspace.mockResolvedValue([[MOCK_USER as never], 1]);
      const pagination = { page: 1, limit: 20, skip: 0 };

      const result = await service.findAll(WS_ID, pagination as never);

      expect(typeof result.items[0]?.emailVerified).toBe('boolean');
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return safe user DTO', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      const result = await service.findById(TARGET_ID, WS_ID);

      expect(result.id).toBe(TARGET_ID);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user not in workspace', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(null);

      await expect(service.findById(TARGET_ID, WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { firstName: 'Updated' };
    const updated = { ...MOCK_USER, firstName: 'Updated' };

    it('should allow user to update their own profile', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);
      repo.update.mockResolvedValue(updated as never);

      const result = await service.update(TARGET_ID, dto, TARGET_ID, 'VIEWER', WS_ID);

      expect(result.firstName).toBe('Updated');
    });

    it('should allow ADMIN to update any user', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);
      repo.update.mockResolvedValue(updated as never);

      await expect(
        service.update(TARGET_ID, dto, ADMIN_ID, 'ADMIN', WS_ID),
      ).resolves.toBeDefined();
    });

    it('should throw ForbiddenException when VIEWER updates another user', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      await expect(
        service.update(TARGET_ID, dto, VIEWER_ID, 'VIEWER', WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when non-admin tries to change role', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      await expect(
        service.update(TARGET_ID, { role: UserRole.ADMIN }, TARGET_ID, 'VIEWER', WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER to change user role', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);
      repo.update.mockResolvedValue({ ...MOCK_USER, role: UserRole.ADMIN } as never);

      const result = await service.update(
        TARGET_ID,
        { role: UserRole.ADMIN },
        OWNER_ID,
        'OWNER',
        WS_ID,
      );

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw NotFoundException when user not found in workspace', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(null);

      await expect(
        service.update(TARGET_ID, dto, OWNER_ID, 'OWNER', WS_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should soft-delete user when OWNER removes another user', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      await expect(
        service.remove(TARGET_ID, OWNER_ID, 'OWNER', WS_ID),
      ).resolves.toBeUndefined();

      expect(repo.softDelete).toHaveBeenCalledWith(TARGET_ID);
    });

    it('should throw ForbiddenException when user deletes themselves', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      await expect(
        service.remove(TARGET_ID, TARGET_ID, 'VIEWER', WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when VIEWER tries to delete', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(MOCK_USER as never);

      await expect(
        service.remove(TARGET_ID, VIEWER_ID, 'VIEWER', WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ADMIN tries to delete OWNER', async () => {
      const ownerUser = buildUser({ id: TARGET_ID, role: UserRole.OWNER });
      repo.findByIdInWorkspace.mockResolvedValue(ownerUser as never);

      await expect(
        service.remove(TARGET_ID, ADMIN_ID, 'ADMIN', WS_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      repo.findByIdInWorkspace.mockResolvedValue(null);

      await expect(
        service.remove(TARGET_ID, OWNER_ID, 'OWNER', WS_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
