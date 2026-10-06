import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SelectSupplierDto {
  @ApiProperty({ description: 'ID of the supplier to select as the winner' })
  @IsUUID()
  supplierId!: string;

  @ApiPropertyOptional({ description: 'Reason for the manual selection' })
  @IsOptional()
  @IsString()
  reason?: string;
}
