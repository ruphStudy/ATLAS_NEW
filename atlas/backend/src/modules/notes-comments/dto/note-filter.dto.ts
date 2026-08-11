import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteType, NoteStatus } from '../interfaces';
import { NOTE_SORT_FIELDS } from '../constants';

export class NoteFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @IsEnum(NoteStatus)
  @IsOptional()
  status?: NoteStatus;

  @IsString()
  @IsOptional()
  authorId?: string;

  /** Omit to fetch both top-level notes and replies; pass empty/undefined semantics are handled by the service ("topLevelOnly" convenience below). */
  @IsString()
  @IsOptional()
  parentId?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  topLevelOnly?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isResolved?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(NOTE_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof NOTE_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
