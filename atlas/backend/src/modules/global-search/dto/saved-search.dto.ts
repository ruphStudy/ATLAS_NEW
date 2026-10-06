import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  query?: string;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}

export class UpdateSavedSearchDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  query?: string;

  @IsObject()
  @IsOptional()
  filters?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}
