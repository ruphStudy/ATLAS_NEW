import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AiImageProvider, AiImageStatus } from '../interfaces';

export class AiImageFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(AiImageStatus, { each: true })
  status?: AiImageStatus[];

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsEnum(AiImageProvider)
  provider?: AiImageProvider;
}
