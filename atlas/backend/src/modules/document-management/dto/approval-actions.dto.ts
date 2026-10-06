import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ApproveDocumentDto {
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectDocumentDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RequestDocumentRevisionDto {
  @IsString()
  @IsNotEmpty()
  notes!: string;
}
