import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ListingMarketplace, ListingSection } from '../interfaces';

export class CreateListingDto {
  @IsString()
  catalogProductId!: string;

  @IsEnum(ListingMarketplace)
  marketplace!: ListingMarketplace;

  @IsOptional()
  @IsString()
  aiDescriptionId?: string;

  @IsOptional()
  @IsString()
  aiImageSetId?: string;

  @IsOptional()
  @IsString()
  aiSeoId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ListingSection, { each: true })
  sections?: ListingSection[];
}
