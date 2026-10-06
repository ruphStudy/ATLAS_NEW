import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class MfaChallengeResponseDto {
  @ApiProperty({ example: true })
  mfaRequired!: true;

  @ApiProperty({ description: 'Short-lived signed challenge — contains no secrets, submit with the TOTP code to POST /auth/mfa/login' })
  challenge!: string;
}

export class MfaChallengeVerifyDto {
  @ApiProperty({ description: 'The challenge returned by POST /auth/login' })
  @IsString()
  @IsNotEmpty()
  challenge!: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'code must be a 6-digit number' })
  code!: string;
}
