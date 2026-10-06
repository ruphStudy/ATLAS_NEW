import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CancelPurchaseOrderDto {
  @ApiProperty() @IsString() reason!: string;
}

export class AcknowledgePurchaseOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
