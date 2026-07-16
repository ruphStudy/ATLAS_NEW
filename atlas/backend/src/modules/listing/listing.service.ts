import { Injectable } from '@nestjs/common';
import { ListingRepository } from './listing.repository';

@Injectable()
export class ListingService {
  constructor(private readonly listingRepository: ListingRepository) {}
}
