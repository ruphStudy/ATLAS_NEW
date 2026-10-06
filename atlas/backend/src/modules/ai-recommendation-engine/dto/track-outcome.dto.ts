import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';

export class TrackOutcomeDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsNotEmpty()
  outcomeType!: string;

  @IsBoolean()
  @IsNotEmpty()
  success!: boolean;

  @IsObject()
  @IsOptional()
  actualResult?: unknown;

  @IsObject()
  @IsOptional()
  expectedResult?: unknown;

  @IsNumber()
  @IsOptional()
  effectivenessScore?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
