import { Injectable } from '@nestjs/common';
import { PricingRepository } from './pricing.repository';

@Injectable()
export class PricingService {
  constructor(private readonly pricingRepository: PricingRepository) {}
}
