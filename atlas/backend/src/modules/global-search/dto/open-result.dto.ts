import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/** Called when the user opens/acts on a result — feeds "recent entities" via the Activity Center. */
export class OpenResultDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsObject()
  @IsOptional()
  navigationRef?: Record<string, unknown>;
}
