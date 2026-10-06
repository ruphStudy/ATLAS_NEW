import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'Base32 TOTP secret — shown once for manual entry into an authenticator app. Not persisted in plaintext.' })
  secret!: string;

  @ApiProperty({ description: 'otpauth:// URI for rendering a QR code' })
  otpauthUrl!: string;
}
