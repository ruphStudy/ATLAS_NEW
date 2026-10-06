import { IsNotEmpty, IsString } from 'class-validator';

/** The new IdP signing certificate (PEM) as re-issued on the identity provider's side — ATLAS never generates one itself. */
export class RotateCertificateDto {
  @IsString()
  @IsNotEmpty()
  certificate: string;
}
