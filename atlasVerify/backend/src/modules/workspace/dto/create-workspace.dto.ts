import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { WORKSPACE_CONSTANTS } from '../constants';

export class CreateWorkspaceDto {
  @ApiProperty({
    example: 'Acme Corp',
    description: `Workspace name (${WORKSPACE_CONSTANTS.NAME_MIN_LENGTH}–${WORKSPACE_CONSTANTS.NAME_MAX_LENGTH} characters)`,
  })
  @IsString()
  @MinLength(WORKSPACE_CONSTANTS.NAME_MIN_LENGTH)
  @MaxLength(WORKSPACE_CONSTANTS.NAME_MAX_LENGTH)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({
    example: 'Our primary commerce workspace',
    maxLength: WORKSPACE_CONSTANTS.DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(WORKSPACE_CONSTANTS.DESCRIPTION_MAX_LENGTH)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.acme.com/logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'logoUrl must be a valid URL' })
  @MaxLength(WORKSPACE_CONSTANTS.LOGO_URL_MAX_LENGTH)
  logoUrl?: string;
}
