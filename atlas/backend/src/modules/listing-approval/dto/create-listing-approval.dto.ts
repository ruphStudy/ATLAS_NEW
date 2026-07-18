import { IsString, IsOptional } from 'class-validator';

export class CreateListingApprovalDto {
  @IsString()
  listingId!: string;

  @IsString()
  catalogProductId!: string;

  @IsOptional()
  @IsString()
  approvalComment?: string;
}
