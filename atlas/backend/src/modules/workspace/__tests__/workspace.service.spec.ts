import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceStatus, WorkspacePlan } from '@prisma/client';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceRepository } from '../workspace.repository';
import type { IWorkspace } from '../interfaces';

// ── Mock uuid + slugify ──────────────────────────────────────
jest.mock('uuid', () => ({ v4: () => 'aaaabbbb-cccc-dddd-eeee-ffffffffffff' }));
jest.mock('@common/utils', () => ({ slugify: (v: string) => v.toLowerCase().replace(/\s+/g, '-') }));

// ── Fixtures ─────────────────────────────────────────────────
const OWNER_ID = 'owner-user-uuid';
const OTHER_USER_ID = 'other-user-uuid';
const ADMIN_USER_ID = 'admin-user-uuid';
const WORKSPACE_ID = 'ws-uuid-1234';

const MOCK_WORKSPACE: IWorkspace = {
  id: WORKSPACE_ID,
  name: 'Acme Corp',
  slug: 'acme-corp-aaaabbbb',
  description: 'Test workspace',
  logoUrl: null,
  ownerId: OWNER_ID,
  status: WorkspaceStatus.ACTIVE,
  plan: WorkspacePlan.FREE,
  createdAt: new Date('2026-07-14T10:00:00.000Z'),
  updatedAt: new Date('2026-07-14T10:00:00.000Z'),
  deletedAt: null,
};

// ── Test Suite ────────────────────────────────────────────────
describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let repo: jest.Mocked<WorkspaceRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: WorkspaceRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn().mockResolvedValue(false),
            findAllForUser: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn().mockResolvedValue(undefined),
            findUserInWorkspace: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkspaceService);
    repo = module.get(WorkspaceRepository);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create() ─────────────────────────────────────────────────
  describe('create()', () => {
    const dto = { name: 'Acme Corp', description: 'Test', logoUrl: undefined };

    it('should create a workspace and return the response DTO', async () => {
      repo.create.mockResolvedValue(MOCK_WORKSPACE);

      const result = await service.create(dto, OWNER_ID);

      expect(result.id).toBe(WORKSPACE_ID);
      expect(result.name).toBe('Acme Corp');
      expect(result.ownerId).toBe(OWNER_ID);
      expect(result.slug).toBe('acme-corp-aaaabbbb');
    });

    it('should generate slug from name with UUID suffix', async () => {
      repo.create.mockResolvedValue(MOCK_WORKSPACE);

      await service.create(dto, OWNER_ID);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'acme-corp-aaaabbbb' }),
      );
    });

    it('should retry slug generation on collision', async () => {
      repo.slugExists
        .mockResolvedValueOnce(true)  // first attempt collides
        .mockResolvedValueOnce(false); // second succeeds
      repo.create.mockResolvedValue(MOCK_WORKSPACE);

      await service.create(dto, OWNER_ID);

      expect(repo.slugExists).toHaveBeenCalledTimes(2);
    });

    it('should set ownerId to the creating user', async () => {
      repo.create.mockResolvedValue(MOCK_WORKSPACE);
      await service.create(dto, OWNER_ID);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: OWNER_ID }),
      );
    });

    it('should not expose internal fields in the response', async () => {
      repo.create.mockResolvedValue(MOCK_WORKSPACE);
      const result = await service.create(dto, OWNER_ID);
      expect(result).not.toHaveProperty('settings');
      expect(result).not.toHaveProperty('metadata');
      expect(result).not.toHaveProperty('deletedAt');
    });
  });

  // ── findAll() ─────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return paginated workspace list', async () => {
      repo.findAllForUser.mockResolvedValue([[MOCK_WORKSPACE], 1]);
      const pagination = { page: 1, limit: 20, skip: 0, sortOrder: 'desc' as const };

      const result = await service.findAll(OWNER_ID, pagination as never);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should return empty list when user has no workspaces', async () => {
      repo.findAllForUser.mockResolvedValue([[], 0]);
      const pagination = { page: 1, limit: 20, skip: 0, sortOrder: 'desc' as const };

      const result = await service.findAll(OTHER_USER_ID, pagination as never);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ── findById() ────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return workspace DTO when user is the owner', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);

      const result = await service.findById(WORKSPACE_ID, OWNER_ID);

      expect(result.id).toBe(WORKSPACE_ID);
    });

    it('should return workspace DTO when user is a member', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue({ role: 'VIEWER' });

      const result = await service.findById(WORKSPACE_ID, OTHER_USER_ID);

      expect(result.id).toBe(WORKSPACE_ID);
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id', OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue(null);

      await expect(service.findById(WORKSPACE_ID, OTHER_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── update() ─────────────────────────────────────────────────
  describe('update()', () => {
    const dto = { name: 'Updated Corp' };
    const updated = { ...MOCK_WORKSPACE, name: 'Updated Corp' };

    it('should update workspace when user is OWNER', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.update.mockResolvedValue(updated);

      const result = await service.update(WORKSPACE_ID, dto, OWNER_ID);

      expect(result.name).toBe('Updated Corp');
    });

    it('should update workspace when user is ADMIN', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue({ role: 'ADMIN' });
      repo.update.mockResolvedValue(updated);

      const result = await service.update(WORKSPACE_ID, dto, ADMIN_USER_ID);

      expect(result.name).toBe('Updated Corp');
    });

    it('should throw ForbiddenException when user is VIEWER', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue({ role: 'VIEWER' });

      await expect(service.update(WORKSPACE_ID, dto, OTHER_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', dto, OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only update provided fields', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.update.mockResolvedValue(updated);

      await service.update(WORKSPACE_ID, { name: 'New Name' }, OWNER_ID);

      expect(repo.update).toHaveBeenCalledWith(
        WORKSPACE_ID,
        expect.objectContaining({ name: 'New Name' }),
      );
      expect(repo.update).toHaveBeenCalledWith(
        WORKSPACE_ID,
        expect.not.objectContaining({ status: expect.anything() }),
      );
    });
  });

  // ── remove() ─────────────────────────────────────────────────
  describe('remove()', () => {
    it('should soft-delete workspace when user is OWNER', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);

      await expect(service.remove(WORKSPACE_ID, OWNER_ID)).resolves.toBeUndefined();
      expect(repo.softDelete).toHaveBeenCalledWith(WORKSPACE_ID);
    });

    it('should throw ForbiddenException when user is not OWNER', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue({ role: 'ADMIN' });

      await expect(service.remove(WORKSPACE_ID, ADMIN_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has no access', async () => {
      repo.findById.mockResolvedValue(MOCK_WORKSPACE);
      repo.findUserInWorkspace.mockResolvedValue(null);

      await expect(service.remove(WORKSPACE_ID, OTHER_USER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id', OWNER_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
