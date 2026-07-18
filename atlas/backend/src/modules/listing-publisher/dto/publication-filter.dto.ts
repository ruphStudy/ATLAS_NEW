import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PublicationMarketplace, PublicationStatus, SyncStatus } from '../interfaces';

export class PublicationFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PublicationStatus, { each: true })
  status?: PublicationStatus[];

  @IsOptional()
  @IsString()
  listingId?: string;

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsEnum(PublicationMarketplace)
  marketplace?: PublicationMarketplace;

  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;
}
