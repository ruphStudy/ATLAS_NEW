import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ListingMarketplace, ListingStatus } from '../interfaces';

export class ListingFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(ListingStatus, { each: true })
  status?: ListingStatus[];

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsEnum(ListingMarketplace)
  marketplace?: ListingMarketplace;
}
