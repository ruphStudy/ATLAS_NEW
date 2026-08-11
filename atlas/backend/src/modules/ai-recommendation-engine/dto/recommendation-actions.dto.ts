import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class AcceptRecommendationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  acceptedBy: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RejectRecommendationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  rejectedBy: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class DismissRecommendationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  dismissedBy: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class DeferRecommendationDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  deferredBy: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
