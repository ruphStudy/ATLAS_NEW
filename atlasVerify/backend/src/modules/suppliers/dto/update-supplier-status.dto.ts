import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierManagementStatus } from '../constants';

export class UpdateSupplierStatusDto {
  @ApiProperty({ enum: SupplierManagementStatus })
  @IsNotEmpty()
  @IsEnum(SupplierManagementStatus)
  status!: SupplierManagementStatus;

  @ApiPropertyOptional({ example: 'Passed all quality checks' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
