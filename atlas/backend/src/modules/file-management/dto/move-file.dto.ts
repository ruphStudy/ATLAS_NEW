import { IsString, IsOptional } from 'class-validator';

export class MoveFileDto {
  /** Omit or set null to move the file to the workspace root. */
  @IsString()
  @IsOptional()
  folderId?: string | null;
}
