import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PublishVersionDto {
  @IsString()
  @IsNotEmpty()
  versionString: string;

  @IsObject()
  @IsOptional()
  manifest?: Record<string, unknown>;
}

export class RollbackVersionDto {
  @IsString()
  @IsNotEmpty()
  targetVersionId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
