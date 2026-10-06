import { IsOptional, IsString } from 'class-validator';

export class SendInvoiceDto {
  /** Defaults to notifying the workspace's OWNER/ADMIN role when omitted. */
  @IsString()
  @IsOptional()
  targetUserId?: string;
}
