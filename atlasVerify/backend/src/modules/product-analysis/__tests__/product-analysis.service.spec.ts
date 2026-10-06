import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductAnalysisService } from '../product-analysis.service';
import { ProductAnalysisRepository } from '../product-analysis.repository';
import { ProductAnalysisQueue } from '../jobs';
import { AnalysisStatus } from '../interfaces';

describe('ProductAnalysisService', () => {
  let service: ProductAnalysisService;
  let repository: jest.Mocked<ProductAnalysisRepository>;
  let queue: jest.Mocked<ProductAnalysisQueue>;

  const mockWorkspaceId = 'workspace-123';
  const mockOpportunityId = 'opportunity-123';
  const mockAnalysisId = 'analysis-123';

  const mockAnalysis = {
    id: mockAnalysisId,
    workspaceId: mockWorkspaceId,
    opportunityId: mockOpportunityId,
    version: 1,
    status: AnalysisStatus.PENDING,
    demandScore: 75,
    competitionScore: 60,
    profitScore: 80,
    supplierScore: 70,
    finalScore: 71.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      createAnalysis: jest.fn(),
      findAnalysisById: jest.fn(),
      findLatestByOpportunity: jest.fn(),
      findByVersion: jest.fn(),
      findAllAnalyses: jest.fn(),
      updateAnalysis: jest.fn(),
      softDeleteAnalysis: jest.fn(),
      getNextVersion: jest.fn(),
      getAnalysisStats: jest.fn(),
    };

    const mockQueue = {
      addAnalysisJob: jest.fn(),
      getJobStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductAnalysisService,
        { provide: ProductAnalysisRepository, useValue: mockRepository },
        { provide: ProductAnalysisQueue, useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ProductAnalysisService>(ProductAnalysisService);
    repository = module.get(ProductAnalysisRepository);
    queue = module.get(ProductAnalysisQueue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnalysis', () => {
    it('should create a new analysis and queue job', async () => {
      repository.getNextVersion.mockResolvedValue(1);
      repository.findByVersion.mockResolvedValue(null);
      repository.createAnalysis.mockResolvedValue(mockAnalysis);
      queue.addAnalysisJob.mockResolvedValue(undefined);

      const result = await service.createAnalysis(mockWorkspaceId, {
        opportunityId: mockOpportunityId,
      });

      expect(repository.getNextVersion).toHaveBeenCalledWith(
        mockOpportunityId,
        mockWorkspaceId,
      );
      expect(repository.createAnalysis).toHaveBeenCalledWith({
        workspaceId: mockWorkspaceId,
        opportunityId: mockOpportunityId,
        version: 1,
        status: AnalysisStatus.PENDING,
      });
      expect(queue.addAnalysisJob).toHaveBeenCalledWith({
        analysisId: mockAnalysisId,
        opportunityId: mockOpportunityId,
        workspaceId: mockWorkspaceId,
        version: 1,
      });
      expect(result.id).toBe(mockAnalysisId);
    });

    it('should throw BadRequestException if version already exists', async () => {
      repository.getNextVersion.mockResolvedValue(1);
      repository.findByVersion.mockResolvedValue(mockAnalysis);

      await expect(
        service.createAnalysis(mockWorkspaceId, {
          opportunityId: mockOpportunityId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAnalysisById', () => {
    it('should return analysis by ID', async () => {
      repository.findAnalysisById.mockResolvedValue(mockAnalysis);

      const result = await service.findAnalysisById(mockAnalysisId, mockWorkspaceId);

      expect(repository.findAnalysisById).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
      );
      expect(result.id).toBe(mockAnalysisId);
    });

    it('should throw NotFoundException if analysis not found', async () => {
      repository.findAnalysisById.mockResolvedValue(null);

      await expect(
        service.findAnalysisById(mockAnalysisId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findLatestByOpportunity', () => {
    it('should return latest analysis for opportunity', async () => {
      repository.findLatestByOpportunity.mockResolvedValue(mockAnalysis);

      const result = await service.findLatestByOpportunity(
        mockOpportunityId,
        mockWorkspaceId,
      );

      expect(repository.findLatestByOpportunity).toHaveBeenCalledWith(
        mockOpportunityId,
        mockWorkspaceId,
      );
      expect(result?.id).toBe(mockAnalysisId);
    });

    it('should return null if no analysis found', async () => {
      repository.findLatestByOpportunity.mockResolvedValue(null);

      const result = await service.findLatestByOpportunity(
        mockOpportunityId,
        mockWorkspaceId,
      );

      expect(result).toBeNull();
    });
  });

  describe('findAllAnalyses', () => {
    it('should return paginated analyses', async () => {
      repository.findAllAnalyses.mockResolvedValue([[mockAnalysis], 1]);

      const result = await service.findAllAnalyses(mockWorkspaceId, {
        page: 1,
        limit: 20,
      });

      expect(repository.findAllAnalyses).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('updateAnalysis', () => {
    it('should update analysis', async () => {
      const updateDto = { status: AnalysisStatus.COMPLETED };
      const updatedAnalysis = { ...mockAnalysis, ...updateDto };

      repository.findAnalysisById.mockResolvedValue(mockAnalysis);
      repository.updateAnalysis.mockResolvedValue(updatedAnalysis);

      const result = await service.updateAnalysis(
        mockAnalysisId,
        mockWorkspaceId,
        updateDto,
      );

      expect(repository.updateAnalysis).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
        updateDto,
      );
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });

    it('should throw NotFoundException if analysis not found', async () => {
      repository.findAnalysisById.mockResolvedValue(null);

      await expect(
        service.updateAnalysis(mockAnalysisId, mockWorkspaceId, {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAnalysis', () => {
    it('should soft delete analysis', async () => {
      repository.findAnalysisById.mockResolvedValue(mockAnalysis);
      repository.softDeleteAnalysis.mockResolvedValue({
        ...mockAnalysis,
        deletedAt: new Date(),
      });

      await service.deleteAnalysis(mockAnalysisId, mockWorkspaceId);

      expect(repository.softDeleteAnalysis).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
      );
    });

    it('should throw NotFoundException if analysis not found', async () => {
      repository.findAnalysisById.mockResolvedValue(null);

      await expect(
        service.deleteAnalysis(mockAnalysisId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('triggerReanalysis', () => {
    it('should create new version for re-analysis', async () => {
      repository.getNextVersion.mockResolvedValue(2);
      repository.findByVersion.mockResolvedValue(null);
      repository.createAnalysis.mockResolvedValue({
        ...mockAnalysis,
        version: 2,
      });
      queue.addAnalysisJob.mockResolvedValue(undefined);

      const result = await service.triggerReanalysis(
        mockOpportunityId,
        mockWorkspaceId,
      );

      expect(repository.getNextVersion).toHaveBeenCalledWith(
        mockOpportunityId,
        mockWorkspaceId,
      );
      expect(result.version).toBe(2);
    });
  });

  describe('getAnalysisStats', () => {
    it('should return analysis statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 20,
        running: 10,
        completed: 60,
        failed: 10,
      };

      repository.getAnalysisStats.mockResolvedValue(mockStats);

      const result = await service.getAnalysisStats(mockWorkspaceId);

      expect(repository.getAnalysisStats).toHaveBeenCalledWith(mockWorkspaceId);
      expect(result).toEqual(mockStats);
    });
  });

  describe('executeAnalysis', () => {
    it('should execute analysis and update with results', async () => {
      const runningAnalysis = {
        ...mockAnalysis,
        status: AnalysisStatus.RUNNING,
      };

      repository.findAnalysisById.mockResolvedValue(mockAnalysis);
      repository.updateAnalysis
        .mockResolvedValueOnce(runningAnalysis)
        .mockResolvedValueOnce({
          ...mockAnalysis,
          status: AnalysisStatus.COMPLETED,
        });

      await service.executeAnalysis(mockAnalysisId, mockWorkspaceId);

      expect(repository.updateAnalysis).toHaveBeenCalledTimes(2);
      expect(repository.updateAnalysis).toHaveBeenNthCalledWith(
        1,
        mockAnalysisId,
        mockWorkspaceId,
        expect.objectContaining({
          status: AnalysisStatus.RUNNING,
        }),
      );
      expect(repository.updateAnalysis).toHaveBeenNthCalledWith(
        2,
        mockAnalysisId,
        mockWorkspaceId,
        expect.objectContaining({
          status: AnalysisStatus.COMPLETED,
        }),
      );
    });

    it('should handle analysis failure', async () => {
      repository.findAnalysisById.mockResolvedValue(mockAnalysis);
      repository.updateAnalysis.mockRejectedValueOnce(new Error('Analysis error'));

      await expect(
        service.executeAnalysis(mockAnalysisId, mockWorkspaceId),
      ).rejects.toThrow();
    });

    it('should throw NotFoundException if analysis not found', async () => {
      repository.findAnalysisById.mockResolvedValue(null);

      await expect(
        service.executeAnalysis(mockAnalysisId, mockWorkspaceId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
