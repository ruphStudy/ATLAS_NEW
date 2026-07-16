import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceStatus, WorkspacePlan } from '@prisma/client';
import { WorkspaceController } from '../workspace.controller';
import { WorkspaceService } from '../workspace.service';
import type { WorkspaceResponseDto } from '../dto';
import type { IWorkspaceListResult } from '../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const OWNER_ID = 'owner-user-uuid';
const WORKSPACE_ID = 'ws-uuid-1234';

const MOCK_WORKSPACE_RESPONSE: WorkspaceResponseDto = {
  id: WORKSPACE_ID,
  name: 'Acme Corp',
  slug: 'acme-corp-aaaabbbb',
  description: 'Test workspace',
  logoUrl: null,
  ownerId: OWNER_ID,
  status: WorkspaceStatus.ACTIVE,
  plan: WorkspacePlan.FREE,
  createdAt: '2026-07-14T10:00:00.000Z',
  updatedAt: '2026-07-14T10:00:00.000Z',
};

const MOCK_LIST_RESULT = {
  items: [MOCK_WORKSPACE_RESPONSE],
  total: 1,
  page: 1,
  limit: 20,
};

// ── Test Suite ────────────────────────────────────────────────
describe('WorkspaceController', () => {
  let controller: WorkspaceController;
  let service: jest.Mocked<WorkspaceService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspaceController],
      providers: [
        {
          provide: WorkspaceService,
          useValue: {
            create: jest.fn(),
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

    controller = module.get(WorkspaceController);
    service = module.get(WorkspaceService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    const dto = { name: 'Acme Corp', description: 'Test' };

    it('should return workspace response on success', async () => {
      service.create.mockResolvedValue(MOCK_WORKSPACE_RESPONSE);
      const result = await controller.create(dto as never, OWNER_ID);
      expect(result).toEqual(MOCK_WORKSPACE_RESPONSE);
    });

    it('should call service.create with dto and userId', async () => {
      service.create.mockResolvedValue(MOCK_WORKSPACE_RESPONSE);
      await controller.create(dto as never, OWNER_ID);
      expect(service.create).toHaveBeenCalledWith(dto, OWNER_ID);
    });
  });

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated workspace list', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST_RESULT);
      const pagination = { page: 1, limit: 20, skip: 0, sortOrder: 'desc' as const };

      const result = await controller.findAll(OWNER_ID, pagination as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should call service.findAll with userId and pagination', async () => {
      service.findAll.mockResolvedValue(MOCK_LIST_RESULT);
      const pagination = { page: 1, limit: 20, skip: 0 };

      await controller.findAll(OWNER_ID, pagination as never);

      expect(service.findAll).toHaveBeenCalledWith(OWNER_ID, pagination);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return workspace by ID', async () => {
      service.findById.mockResolvedValue(MOCK_WORKSPACE_RESPONSE);
      const result = await controller.findById(WORKSPACE_ID, OWNER_ID);
      expect(result).toEqual(MOCK_WORKSPACE_RESPONSE);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Workspace not found'));
      await expect(controller.findById('bad-id', OWNER_ID)).rejects.toThrow(NotFoundException);
    });

    it('should propagate ForbiddenException from service', async () => {
      service.findById.mockRejectedValue(new ForbiddenException('Access denied'));
      await expect(controller.findById(WORKSPACE_ID, 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { name: 'Updated Corp' };
    const updated = { ...MOCK_WORKSPACE_RESPONSE, name: 'Updated Corp' };

    it('should return updated workspace', async () => {
      service.update.mockResolvedValue(updated);
      const result = await controller.update(WORKSPACE_ID, dto as never, OWNER_ID);
      expect(result.name).toBe('Updated Corp');
    });

    it('should call service.update with correct arguments', async () => {
      service.update.mockResolvedValue(updated);
      await controller.update(WORKSPACE_ID, dto as never, OWNER_ID);
      expect(service.update).toHaveBeenCalledWith(WORKSPACE_ID, dto, OWNER_ID);
    });

    it('should propagate ForbiddenException for insufficient permissions', async () => {
      service.update.mockRejectedValue(new ForbiddenException('Insufficient permissions'));
      await expect(controller.update(WORKSPACE_ID, dto as never, 'viewer-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should resolve to undefined (204 No Content)', async () => {
      service.remove.mockResolvedValue(undefined);
      const result = await controller.remove(WORKSPACE_ID, OWNER_ID);
      expect(result).toBeUndefined();
    });

    it('should call service.remove with id and userId', async () => {
      service.remove.mockResolvedValue(undefined);
      await controller.remove(WORKSPACE_ID, OWNER_ID);
      expect(service.remove).toHaveBeenCalledWith(WORKSPACE_ID, OWNER_ID);
    });

    it('should propagate ForbiddenException when not OWNER', async () => {
      service.remove.mockRejectedValue(new ForbiddenException('Must be OWNER to delete'));
      await expect(controller.remove(WORKSPACE_ID, 'admin-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should propagate NotFoundException when workspace missing', async () => {
      service.remove.mockRejectedValue(new NotFoundException('Workspace not found'));
      await expect(controller.remove('bad-id', OWNER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
