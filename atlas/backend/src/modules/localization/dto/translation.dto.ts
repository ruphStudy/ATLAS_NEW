import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SetTranslationDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class ImportTranslationsDto {
  @IsObject()
  @IsNotEmpty()
  translations: Record<string, string>;
}

export class TranslateDto {
  @IsObject()
  @IsOptional()
  params?: Record<string, string | number>;
}
