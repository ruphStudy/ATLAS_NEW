import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddFileVersionDto {
  @IsString()
  @IsNotEmpty()
  contentBase64: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
