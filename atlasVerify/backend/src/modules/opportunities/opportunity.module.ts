import { Module } from '@nestjs/common';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';
import { OpportunityRepository } from './opportunity.repository';

@Module({
  controllers: [OpportunityController],
  providers: [OpportunityService, OpportunityRepository],
  exports: [OpportunityService],
})
export class OpportunityModule {}
