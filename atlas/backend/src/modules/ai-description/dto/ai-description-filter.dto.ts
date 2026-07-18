import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { AiDescriptionStatus, AiProvider, GenerationTone } from '../interfaces';

export class AiDescriptionFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(AiDescriptionStatus, { each: true })
  status?: AiDescriptionStatus[];

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @IsOptional()
  @IsEnum(GenerationTone)
  tone?: GenerationTone;

  @IsOptional()
  @IsString()
  language?: string;
}
