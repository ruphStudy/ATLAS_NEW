import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import type { UserResponseDto } from '../dto';
import type { IUserListResult } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const OWNER_ID = 'owner-uuid';
const TARGET_ID = 'target-uuid';

const MOCK_USER_RESPONSE: UserResponseDto = {
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
  emailVerified: false,
  lastLoginAt: null,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_LIST_RESULT: IUserListResult = {
  items: [MOCK_USER_RESPONSE],
  total: 1,
  page: 1,
  limit: 20,
};

const OWNER_PAYLOAD = {
  sub: OWNER_ID,
  email: 'owner@acme.com',
  workspaceId: WS_ID,
  role: 'OWNER',
  type: 'access' as const,
};

// ── Test Suite ────────────────────────────────────────────────
describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated user list', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST_RESULT);
      const pagination = { page: 1, limit: 20, skip: 0, sortOrder: 'desc' as const };

      const result = await controller.findAll(WS_ID, pagination as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should pass workspaceId and pagination to service', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST_RESULT);
      const pagination = { page: 1, limit: 20, skip: 0 };

      await controller.findAll(WS_ID, pagination as never);

      expect(service.findAll).toHaveBeenCalledWith(WS_ID, pagination);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return user by ID', async () => {
      service.findById.mockResolvedValue(MOCK_USER_RESPONSE);

      const result = await controller.findById(TARGET_ID, WS_ID);

      expect(result).toEqual(MOCK_USER_RESPONSE);
      expect(service.findById).toHaveBeenCalledWith(TARGET_ID, WS_ID);
    });

    it('should propagate NotFoundException', async () => {
      service.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findById('bad-id', WS_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { firstName: 'Updated' };
    const updated = { ...MOCK_USER_RESPONSE, firstName: 'Updated' };

    it('should return updated user', async () => {
      service.update.mockResolvedValue(updated);

      const result = await controller.update(TARGET_ID, dto as never, OWNER_PAYLOAD);

      expect(result.firstName).toBe('Updated');
    });

    it('should call service with requester context', async () => {
      service.update.mockResolvedValue(updated);

      await controller.update(TARGET_ID, dto as never, OWNER_PAYLOAD);

      expect(service.update).toHaveBeenCalledWith(
        TARGET_ID,
        dto,
        OWNER_ID,
        'OWNER',
        WS_ID,
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.update.mockRejectedValue(new ForbiddenException('Insufficient permissions'));

      await expect(
        controller.update(TARGET_ID, dto as never, { ...OWNER_PAYLOAD, role: 'VIEWER' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should resolve to undefined (204 No Content)', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TARGET_ID, OWNER_PAYLOAD);

      expect(result).toBeUndefined();
    });

    it('should call service.remove with requester context', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(TARGET_ID, OWNER_PAYLOAD);

      expect(service.remove).toHaveBeenCalledWith(
        TARGET_ID,
        OWNER_ID,
        'OWNER',
        WS_ID,
      );
    });

    it('should propagate ForbiddenException from service', async () => {
      service.remove.mockRejectedValue(
        new ForbiddenException('You cannot delete your own account'),
      );

      await expect(
        controller.remove(OWNER_ID, { ...OWNER_PAYLOAD, sub: OWNER_ID }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate NotFoundException from service', async () => {
      service.remove.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.remove('bad-id', OWNER_PAYLOAD)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
