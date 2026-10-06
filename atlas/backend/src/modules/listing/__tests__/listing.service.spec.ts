import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ListingService } from '../listing.service';
import { ListingRepository } from '../listing.repository';
import { ListingBuilderEngine } from '../engine/listing-builder.engine';
import { ListingQualityEngine } from '../engine/listing-quality.engine';
import { MarketplaceListingEngine } from '../engine/marketplace-listing.engine';
import { ListingGenerationQueue } from '../jobs/listing-generation.queue';
import { ListingEventQueue } from '../jobs/listing-event.queue';
import { MarketplaceListingTransformQueue } from '../jobs/marketplace-listing-transform.queue';
import { ListingStatus } from '../interfaces';

const mockRepo = {
  // legacy listing
  createListing: jest.fn(),
  findListingById: jest.fn(),
  findListingsByCatalogProduct: jest.fn(),
  findAllListings: jest.fn(),
  updateListing: jest.fn(),
  softDeleteListing: jest.fn(),
  createListingHistory: jest.fn(),
  getNextVersion: jest.fn(),
  // universal listing
  createUniversalListing: jest.fn(),
  findUniversalListingById: jest.fn(),
  findUniversalListingsByCatalogProduct: jest.fn(),
  findAllUniversalListings: jest.fn(),
  updateUniversalListing: jest.fn(),
  softDeleteUniversalListing: jest.fn(),
  createUniversalListingHistory: jest.fn(),
  findUniversalListingHistory: jest.fn(),
  getNextUniversalVersion: jest.fn(),
  // marketplace listing
  createMarketplaceListing: jest.fn(),
  findMarketplaceListingById: jest.fn(),
  findMarketplaceListingsByUniversalId: jest.fn(),
  findAllMarketplaceListings: jest.fn(),
  updateMarketplaceListing: jest.fn(),
  softDeleteMarketplaceListing: jest.fn(),
  createMarketplaceListingHistory: jest.fn(),
  findMarketplaceListingHistory: jest.fn(),
};

const mockGenerationQueue = { enqueue: jest.fn() };
const mockEventQueue = { enqueue: jest.fn() };
const mockTransformQueue = { enqueue: jest.fn() };
const mockMarketplaceEngine = { transform: jest.fn(), transformMultiple: jest.fn() };

const WORKSPACE_ID = 'ws-123';
const USER_ID = 'user-abc';

function makeRawUniversalListing(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ul1',
    workspaceId: WORKSPACE_ID,
    catalogProductId: 'prod1',
    status: ListingStatus.GENERATED,
    version: 1,
    content: { title: 'My Product', brand: 'BrandX' },
    qualityScore: 88,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRawMarketplaceListing(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ml1',
    workspaceId: WORKSPACE_ID,
    universalListingId: 'ul1',
    catalogProductId: 'prod1',
    marketplaceKey: 'AMAZON',
    country: 'US',
    status: 'READY',
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ListingService — Universal + Marketplace Listing', () => {
  let service: ListingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingService,
        { provide: ListingRepository, useValue: mockRepo },
        ListingBuilderEngine,
        ListingQualityEngine,
        { provide: MarketplaceListingEngine, useValue: mockMarketplaceEngine },
        { provide: ListingGenerationQueue, useValue: mockGenerationQueue },
        { provide: ListingEventQueue, useValue: mockEventQueue },
        { provide: MarketplaceListingTransformQueue, useValue: mockTransformQueue },
      ],
    }).compile();

    service = module.get<ListingService>(ListingService);
  });

  // ── Universal Listing ─────────────────────────────────────────

  describe('createUniversalListing()', () => {
    it('creates record with workspace and catalogProductId', async () => {
      mockRepo.getNextUniversalVersion.mockResolvedValue(1);
      mockRepo.createUniversalListing.mockResolvedValue(makeRawUniversalListing());
      mockGenerationQueue.enqueue.mockResolvedValue(undefined);

      const result = await service.createUniversalListing(
        WORKSPACE_ID,
        { catalogProductId: 'prod1', sections: [] },
        USER_ID,
      );

      expect(mockRepo.createUniversalListing).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WORKSPACE_ID, catalogProductId: 'prod1' }),
      );
      expect(result.id).toBe('ul1');
    });
  });

  describe('findUniversalListingById()', () => {
    it('returns DTO for existing listing', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(makeRawUniversalListing());
      const result = await service.findUniversalListingById('ul1', WORKSPACE_ID);
      expect(result.id).toBe('ul1');
    });

    it('throws NotFoundException for missing id', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(null);
      await expect(service.findUniversalListingById('none', WORKSPACE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('transformToMarketplace()', () => {
    it('creates marketplace listing record and enqueues transform job', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(
        makeRawUniversalListing({ status: ListingStatus.GENERATED }),
      );
      mockRepo.createMarketplaceListing.mockResolvedValue(makeRawMarketplaceListing());
      mockTransformQueue.enqueue.mockResolvedValue(undefined);
      mockEventQueue.enqueue.mockResolvedValue(undefined);

      await service.transformToMarketplace(
        'ul1',
        WORKSPACE_ID,
        { marketplaceKey: 'AMAZON', country: 'US' },
        USER_ID,
      );

      expect(mockRepo.createMarketplaceListing).toHaveBeenCalledWith(
        expect.objectContaining({ universalListingId: 'ul1', marketplaceKey: 'AMAZON' }),
      );
      expect(mockTransformQueue.enqueue).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException if universal listing missing', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(null);
      await expect(
        service.transformToMarketplace('none', WORKSPACE_ID, { marketplaceKey: 'AMAZON' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transformToMultipleMarketplaces()', () => {
    it('creates one marketplace listing per target', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(makeRawUniversalListing());
      mockRepo.createMarketplaceListing.mockResolvedValue(makeRawMarketplaceListing());
      mockTransformQueue.enqueue.mockResolvedValue(undefined);
      mockEventQueue.enqueue.mockResolvedValue(undefined);

      await service.transformToMultipleMarketplaces(
        'ul1',
        WORKSPACE_ID,
        {
          targets: [
            { marketplaceKey: 'AMAZON', country: 'US' },
            { marketplaceKey: 'FLIPKART', country: 'IN' },
          ],
        },
        USER_ID,
      );

      expect(mockRepo.createMarketplaceListing).toHaveBeenCalledTimes(2);
    });
  });

  describe('previewUniversalListing()', () => {
    it('calls qualityEngine.validate without marketplace argument', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(
        makeRawUniversalListing({ content: { title: 'Title', brand: 'Brand', category: 'Cat', description: 'Desc', images: [{ imageId: 'i', url: 'u', isPrimary: true, position: 1, type: 'MAIN' }], pricing: { sellingPrice: 9.99, currency: 'USD' } } }),
      );

      const result = await service.previewUniversalListing('ul1', WORKSPACE_ID);
      expect(result.qualityScore).toBeDefined();
      expect(result.validationResult).toBeDefined();
    });
  });

  describe('findMarketplaceListingById()', () => {
    it('returns DTO for existing record', async () => {
      mockRepo.findMarketplaceListingById.mockResolvedValue(makeRawMarketplaceListing());
      const result = await service.findMarketplaceListingById('ml1', WORKSPACE_ID);
      expect(result.id).toBe('ml1');
      expect(result.marketplaceKey).toBe('AMAZON');
    });

    it('throws NotFoundException for missing id', async () => {
      mockRepo.findMarketplaceListingById.mockResolvedValue(null);
      await expect(service.findMarketplaceListingById('none', WORKSPACE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('workspace isolation', () => {
    it('findUniversalListingById passes workspaceId to repository', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(makeRawUniversalListing());
      await service.findUniversalListingById('ul1', WORKSPACE_ID);
      expect(mockRepo.findUniversalListingById).toHaveBeenCalledWith('ul1', WORKSPACE_ID);
    });

    it('transformToMarketplace includes workspaceId in marketplace listing creation', async () => {
      mockRepo.findUniversalListingById.mockResolvedValue(makeRawUniversalListing());
      mockRepo.createMarketplaceListing.mockResolvedValue(makeRawMarketplaceListing());
      mockTransformQueue.enqueue.mockResolvedValue(undefined);
      mockEventQueue.enqueue.mockResolvedValue(undefined);

      await service.transformToMarketplace('ul1', WORKSPACE_ID, { marketplaceKey: 'AMAZON' }, USER_ID);
      expect(mockRepo.createMarketplaceListing).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: WORKSPACE_ID }),
      );
    });
  });
});
