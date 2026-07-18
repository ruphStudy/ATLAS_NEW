import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { SeoProvider, SeoStatus } from '../interfaces';

export class SeoFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(SeoStatus, { each: true })
  status?: SeoStatus[];

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsEnum(SeoProvider)
  provider?: SeoProvider;

  @IsOptional()
  @IsString()
  marketplace?: string;
}
