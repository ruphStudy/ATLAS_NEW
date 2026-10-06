import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { USERS_CONSTANTS } from '../constants';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(USERS_CONSTANTS.FIRST_NAME_MIN)
  @MaxLength(USERS_CONSTANTS.FIRST_NAME_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(USERS_CONSTANTS.LAST_NAME_MIN)
  @MaxLength(USERS_CONSTANTS.LAST_NAME_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName?: string;

  @ApiPropertyOptional({ example: '+14155552671', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(USERS_CONSTANTS.PHONE_MAX)
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164 number (e.g. +14155552671)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.acme.com/avatars/john.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  @MaxLength(USERS_CONSTANTS.AVATAR_URL_MAX)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(USERS_CONSTANTS.TIMEZONE_MAX)
  timezone?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  @MaxLength(USERS_CONSTANTS.LOCALE_MAX)
  locale?: string;

  // ── Admin-only fields (enforced by service) ──────────────────
  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Requires OWNER or ADMIN role to change',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'role must be a valid UserRole' })
  role?: UserRole;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Requires OWNER or ADMIN role to change',
  })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'status must be a valid UserStatus' })
  status?: UserStatus;
}
