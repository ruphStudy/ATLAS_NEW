import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EntityTagsQueryDto {
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsOptional()
  module?: string;
}
