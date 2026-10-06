import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ListingContent, ListingMarketplace, ListingSection } from '../interfaces';

export class RegenerateListingSectionsDto {
  @IsArray()
  @IsEnum(ListingSection, { each: true })
  sections!: ListingSection[];

  @IsOptional()
  @IsString()
  aiDescriptionId?: string;

  @IsOptional()
  @IsString()
  aiImageSetId?: string;

  @IsOptional()
  @IsString()
  aiSeoId?: string;
}

export class ManualListingEditDto {
  @IsObject()
  content!: Partial<ListingContent>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitForApprovalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveListingDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PublishListingDto {
  @IsOptional()
  @IsString()
  externalListingId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArchiveListingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
