import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
} from 'class-validator';

export class MergeContextDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  targetContextId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  sourceContextIds!: string[];

  @IsString()
  @IsOptional()
  mergeStrategy?: 'replace' | 'append' | 'merge';
}
