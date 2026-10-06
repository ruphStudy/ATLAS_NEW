import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PromoteCandidateDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'ID of the MarketplaceProductCandidate to promote into an Opportunity for the current workspace.',
  })
  @IsUUID()
  marketplaceProductCandidateId!: string;
}
