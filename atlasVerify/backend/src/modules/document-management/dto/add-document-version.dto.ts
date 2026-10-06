import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddDocumentVersionDto {
  /** Base64-encoded new version content, forwarded to File Management's own version history. */
  @IsString()
  @IsNotEmpty()
  contentBase64: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
