import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class UpdateIncidentDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  rootCause?: string;

  @IsString()
  @IsOptional()
  resolution?: string;
}
