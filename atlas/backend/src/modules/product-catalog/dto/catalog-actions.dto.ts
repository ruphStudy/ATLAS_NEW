import { IsOptional, IsString } from 'class-validator';

export class ApproveCatalogDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArchiveCatalogDto {
  @IsString()
  reason!: string;
}

export class RequestAiGenerationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkAiGeneratedDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitForApprovalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PublishCatalogDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RevertToDraftDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
