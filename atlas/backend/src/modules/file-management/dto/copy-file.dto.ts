import { IsString, IsOptional } from 'class-validator';

export class CopyFileDto {
  @IsString()
  @IsOptional()
  folderId?: string | null;

  @IsString()
  @IsOptional()
  name?: string;
}
