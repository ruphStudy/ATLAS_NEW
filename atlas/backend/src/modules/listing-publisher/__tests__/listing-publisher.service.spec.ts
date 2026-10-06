import { ConflictException, NotFoundException } from '@nestjs/common';
import { ListingPublisherService } from '../listing-publisher.service';
import { MarketplaceAccountResolver } from '../marketplace-account-resolver.service';
import { PublicationMarketplace, PublicationStatus, PublishTrigger, SyncStatus } from '../interfaces';
import { AccountStatus } from '../../marketplace-account/interfaces';

function makeDeps() {
  const repository = {
    findByListingAndMarketplace: jest.fn().mockResolvedValue(null),
    getNextVersion: jest.fn().mockResolvedValue(1),
    create: jest.fn().mockImplementation((data: Record<string, unknown>) => ({
      id: 'pub-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    createHistoryEntry: jest.fn().mockResolvedValue(undefined),
  };
  const publishQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const bulkPublishQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const eventQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const adapterEngine = {};
  const marketplaceAccountService = {
    findById: jest.fn(),
    findAll: jest.fn(),
  };
  const accountResolver = new MarketplaceAccountResolver(marketplaceAccountService as any);

  return {
    repository,
    publishQueue,
    bulkPublishQueue,
    eventQueue,
    adapterEngine,
    marketplaceAccountService,
    accountResolver,
  };
}

function makeService(deps: ReturnType<typeof makeDeps>) {
  return new ListingPublisherService(
    deps.repository as any,
    deps.publishQueue as any,
    deps.bulkPublishQueue as any,
    deps.eventQueue as any,
    deps.adapterEngine as any,
    deps.accountResolver as any,
  );
}

const BASE_DTO = {
  listingId: 'listing-1',
  catalogProductId: 'cat-1',
  marketplace: PublicationMarketplace.AMAZON,
};

describe('ListingPublisherService — Amazon account selection', () => {
  it('uses the workspace\'s single active Amazon account when none is specified (deterministic default)', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findAll.mockResolvedValue({
      items: [{ id: 'acct-1', isDefault: false }],
    });
    const service = makeService(deps);

    await service.publish('ws-1', BASE_DTO as any, 'user-1');

    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceAccountId: 'acct-1' }),
    );
    expect(deps.publishQueue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceAccountId: 'acct-1' }),
      undefined,
    );
  });

  it('rejects with a conflict when multiple active Amazon accounts exist with no unambiguous default', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findAll.mockResolvedValue({
      items: [
        { id: 'acct-1', isDefault: false },
        { id: 'acct-2', isDefault: false },
      ],
    });
    const service = makeService(deps);

    await expect(service.publish('ws-1', BASE_DTO as any, 'user-1')).rejects.toThrow(ConflictException);
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('resolves the single default account when multiple accounts exist and one is marked default', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findAll.mockResolvedValue({
      items: [
        { id: 'acct-1', isDefault: false },
        { id: 'acct-2', isDefault: true },
      ],
    });
    const service = makeService(deps);

    await service.publish('ws-1', BASE_DTO as any, 'user-1');

    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceAccountId: 'acct-2' }),
    );
  });

  it('rejects when no active Amazon account is connected for the workspace', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findAll.mockResolvedValue({ items: [] });
    const service = makeService(deps);

    await expect(service.publish('ws-1', BASE_DTO as any, 'user-1')).rejects.toThrow(ConflictException);
  });

  it('cannot publish using another workspace\'s marketplaceAccountId — findById is workspace-scoped', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findById.mockRejectedValue(
      new NotFoundException("Account 'acct-victim' not found"),
    );
    const service = makeService(deps);

    await expect(
      service.publish(
        'ws-attacker',
        { ...BASE_DTO, marketplaceAccountId: 'acct-victim' } as any,
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
    expect(deps.marketplaceAccountService.findById).toHaveBeenCalledWith('acct-victim', 'ws-attacker');
    expect(deps.repository.create).not.toHaveBeenCalled();
  });

  it('rejects an explicitly specified account that is not active', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findById.mockResolvedValue({
      id: 'acct-1',
      providerKey: 'AMAZON',
      status: AccountStatus.DISABLED,
    });
    const service = makeService(deps);

    await expect(
      service.publish('ws-1', { ...BASE_DTO, marketplaceAccountId: 'acct-1' } as any, 'user-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('accepts an explicit, active, correctly-scoped account', async () => {
    const deps = makeDeps();
    deps.marketplaceAccountService.findById.mockResolvedValue({
      id: 'acct-1',
      providerKey: 'AMAZON',
      status: AccountStatus.ACTIVE,
    });
    const service = makeService(deps);

    await service.publish('ws-1', { ...BASE_DTO, marketplaceAccountId: 'acct-1' } as any, 'user-1');

    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceAccountId: 'acct-1' }),
    );
  });

  it('does not require an account for non-Amazon marketplaces', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.publish('ws-1', { ...BASE_DTO, marketplace: PublicationMarketplace.SHOPIFY } as any, 'user-1');

    expect(deps.marketplaceAccountService.findAll).not.toHaveBeenCalled();
    expect(deps.marketplaceAccountService.findById).not.toHaveBeenCalled();
    expect(deps.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceAccountId: null }),
    );
  });
});
