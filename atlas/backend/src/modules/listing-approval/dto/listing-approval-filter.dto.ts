import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ApprovalStatus } from '../interfaces';

export class ListingApprovalFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(ApprovalStatus, { each: true })
  status?: ApprovalStatus[];

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  reviewedBy?: string;
}
