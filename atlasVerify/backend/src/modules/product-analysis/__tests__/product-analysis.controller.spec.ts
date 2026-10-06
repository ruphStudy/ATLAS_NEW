import { Test, TestingModule } from '@nestjs/testing';
import { ProductAnalysisController } from '../product-analysis.controller';
import { ProductAnalysisService } from '../product-analysis.service';
import { AnalysisStatus } from '../interfaces';

describe('ProductAnalysisController', () => {
  let controller: ProductAnalysisController;
  let service: jest.Mocked<ProductAnalysisService>;

  const mockWorkspaceId = 'workspace-123';
  const mockOpportunityId = 'opportunity-123';
  const mockAnalysisId = 'analysis-123';

  const mockAnalysisResponse = {
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
    const mockService = {
      createAnalysis: jest.fn(),
      findAnalysisById: jest.fn(),
      findLatestByOpportunity: jest.fn(),
      findAllAnalyses: jest.fn(),
      updateAnalysis: jest.fn(),
      deleteAnalysis: jest.fn(),
      triggerReanalysis: jest.fn(),
      getAnalysisStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductAnalysisController],
      providers: [{ provide: ProductAnalysisService, useValue: mockService }],
    }).compile();

    controller = module.get<ProductAnalysisController>(ProductAnalysisController);
    service = module.get(ProductAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnalysis', () => {
    it('should create a new analysis', async () => {
      const createDto = { opportunityId: mockOpportunityId };
      service.createAnalysis.mockResolvedValue(mockAnalysisResponse);

      const result = await controller.createAnalysis(mockWorkspaceId, createDto);

      expect(service.createAnalysis).toHaveBeenCalledWith(
        mockWorkspaceId,
        createDto,
      );
      expect(result).toEqual(mockAnalysisResponse);
    });
  });

  describe('findAllAnalyses', () => {
    it('should return paginated analyses', async () => {
      const filter = { page: 1, limit: 20 };
      const mockResponse = {
        data: [mockAnalysisResponse],
        total: 1,
        page: 1,
        limit: 20,
      };

      service.findAllAnalyses.mockResolvedValue(mockResponse);

      const result = await controller.findAllAnalyses(mockWorkspaceId, filter);

      expect(service.findAllAnalyses).toHaveBeenCalledWith(
        mockWorkspaceId,
        filter,
      );
      expect(result).toEqual(mockResponse);
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

      service.getAnalysisStats.mockResolvedValue(mockStats);

      const result = await controller.getAnalysisStats(mockWorkspaceId);

      expect(service.getAnalysisStats).toHaveBeenCalledWith(mockWorkspaceId);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getLatestByOpportunity', () => {
    it('should return latest analysis for opportunity', async () => {
      service.findLatestByOpportunity.mockResolvedValue(mockAnalysisResponse);

      const result = await controller.getLatestByOpportunity(
        mockWorkspaceId,
        mockOpportunityId,
      );

      expect(service.findLatestByOpportunity).toHaveBeenCalledWith(
        mockOpportunityId,
        mockWorkspaceId,
      );
      expect(result).toEqual(mockAnalysisResponse);
    });
  });

  describe('triggerReanalysis', () => {
    it('should trigger re-analysis', async () => {
      const reanalysisResponse = { ...mockAnalysisResponse, version: 2 };
      service.triggerReanalysis.mockResolvedValue(reanalysisResponse);

      const result = await controller.triggerReanalysis(
        mockWorkspaceId,
        mockOpportunityId,
      );

      expect(service.triggerReanalysis).toHaveBeenCalledWith(
        mockOpportunityId,
        mockWorkspaceId,
      );
      expect(result.version).toBe(2);
    });
  });

  describe('findAnalysisById', () => {
    it('should return analysis by ID', async () => {
      service.findAnalysisById.mockResolvedValue(mockAnalysisResponse);

      const result = await controller.findAnalysisById(
        mockWorkspaceId,
        mockAnalysisId,
      );

      expect(service.findAnalysisById).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
      );
      expect(result).toEqual(mockAnalysisResponse);
    });
  });

  describe('updateAnalysis', () => {
    it('should update analysis', async () => {
      const updateDto = { status: AnalysisStatus.COMPLETED };
      const updatedResponse = { ...mockAnalysisResponse, ...updateDto };

      service.updateAnalysis.mockResolvedValue(updatedResponse);

      const result = await controller.updateAnalysis(
        mockWorkspaceId,
        mockAnalysisId,
        updateDto,
      );

      expect(service.updateAnalysis).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
        updateDto,
      );
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis', async () => {
      service.deleteAnalysis.mockResolvedValue(undefined);

      await controller.deleteAnalysis(mockWorkspaceId, mockAnalysisId);

      expect(service.deleteAnalysis).toHaveBeenCalledWith(
        mockAnalysisId,
        mockWorkspaceId,
      );
    });
  });
});
