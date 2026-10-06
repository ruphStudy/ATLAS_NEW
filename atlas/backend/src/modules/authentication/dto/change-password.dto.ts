import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Proven by the current password itself (same trust level as `LoginDto`),
 * not by a bearer token — this is deliberate: a user whose password has
 * expired must still be able to rotate it even though `login()` refuses to
 * issue tokens for an expired password. An authenticated caller may also
 * use this route; it works identically either way.
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'john@acmecorp.com' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty({ message: 'currentPassword must not be empty' })
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({
    example: 'N3w!Str0ngPassw0rd',
    description: 'New password (12–128 chars, must include uppercase, lowercase, digit, and special character)',
    minLength: 12,
    maxLength: 128,
  })
  @IsString()
  @MinLength(12, { message: 'newPassword must be at least 12 characters' })
  @MaxLength(128, { message: 'newPassword must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/, {
    message: 'newPassword must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;
}
