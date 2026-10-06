import { IsNotEmpty, IsString } from 'class-validator';

/** Invoice Management does not render PDFs itself — this attaches an already-rendered document (bytes supplied by the caller) via the existing Document Management module. */
export class AttachInvoiceDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  contentBase64: string;
}
