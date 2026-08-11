import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateNamespaceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'key must be a lowercase, hyphen-separated identifier (e.g. "notifications")',
  })
  key: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateTranslationKeyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]+(\.[a-zA-Z0-9_-]+)*$/, {
    message: 'key must be a dot-separated identifier (e.g. "order.created.title")',
  })
  key: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  defaultValue?: string;
}
