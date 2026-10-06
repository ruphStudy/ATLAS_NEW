import { IsNotEmpty, IsString } from 'class-validator';

export class InvoiceReasonDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
