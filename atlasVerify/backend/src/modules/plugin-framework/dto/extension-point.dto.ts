import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class RegisterExtensionPointDto {
  @IsString()
  @IsNotEmpty()
  extensionPointKey: string;

  @IsString()
  @IsNotEmpty()
  hookName: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;
}
