import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListingService } from './listing.service';

@ApiTags('Listing')
@Controller({ path: 'listings', version: '1' })
export class ListingController {
  constructor(private readonly listingService: ListingService) {}
}
