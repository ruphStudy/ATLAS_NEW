import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BulkPublishItem, PublicationMarketplace, PublishTrigger } from '../interfaces';

export class PublishListingDto {
  @IsString()
  listingId!: string;

  @IsString()
  catalogProductId!: string;

  @IsEnum(PublicationMarketplace)
  marketplace!: PublicationMarketplace;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkPublishItemDto implements BulkPublishItem {
  @IsString()
  listingId!: string;

  @IsString()
  catalogProductId!: string;

  @IsEnum(PublicationMarketplace)
  marketplace!: PublicationMarketplace;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BulkPublishDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkPublishItemDto)
  items!: BulkPublishItemDto[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UnpublishListingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RepublishListingDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RetryPublicationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArchivePublicationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
