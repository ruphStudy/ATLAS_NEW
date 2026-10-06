import { IsString, IsNotEmpty, IsOptional, IsObject, IsNumber } from 'class-validator';

export class SetTranslationDto {
  @IsString()
  @IsNotEmpty()
  value!: string;
}

export class ImportTranslationsDto {
  @IsObject()
  @IsNotEmpty()
  translations!: Record<string, string>;
}

export class TranslateDto {
  @IsObject()
  @IsOptional()
  params?: Record<string, string | number>;
}

export class TranslatePluralDto {
  @IsNumber()
  count!: number;

  @IsObject()
  @IsOptional()
  params?: Record<string, string | number>;
}
