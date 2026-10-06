import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { NoteType, NoteVisibility } from '../interfaces';

export class CreateNoteDto {
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  /** Set to reply to an existing COMMENT — threads the conversation. */
  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

  /** Required when visibility is TEAM — the role key whose holders may view this note. */
  @IsString()
  @IsOptional()
  visibilityRoleKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mentionedUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mentionedRoleKeys?: string[];
}
