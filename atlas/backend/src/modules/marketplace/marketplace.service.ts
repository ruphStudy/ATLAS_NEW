import { Injectable } from '@nestjs/common';
import { MarketplaceRepository } from './marketplace.repository';

@Injectable()
export class MarketplaceService {
  constructor(private readonly marketplaceRepository: MarketplaceRepository) {}
}
