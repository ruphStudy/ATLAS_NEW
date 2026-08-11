import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { NoteVisibility } from '../interfaces';

export class UpdateNoteDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

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
