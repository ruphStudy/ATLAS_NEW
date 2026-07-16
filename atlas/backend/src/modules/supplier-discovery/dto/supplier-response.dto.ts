import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierSourceProvider, SupplierStatus, SupplierTier } from '../interfaces';

export class SupplierResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() workspaceId: string = '';
  @ApiProperty() name: string = '';
  @ApiProperty({ enum: SupplierSourceProvider }) provider: SupplierSourceProvider = SupplierSourceProvider.MANUAL;
  @ApiPropertyOptional({ nullable: true }) providerSupplierId: string | null = null;
  @ApiProperty() country: string = 'IN';
  @ApiPropertyOptional({ nullable: true }) city: string | null = null;
  @ApiPropertyOptional({ nullable: true }) website: string | null = null;
  @ApiPropertyOptional({ nullable: true }) contactEmail: string | null = null;
  @ApiPropertyOptional({ nullable: true }) contactPhone: string | null = null;
  @ApiProperty({ enum: SupplierTier }) tier: SupplierTier = SupplierTier.UNVERIFIED;
  @ApiProperty({ enum: SupplierStatus }) status: SupplierStatus = SupplierStatus.PENDING_REVIEW;
  @ApiProperty({ example: [] }) categories: string[] = [];
  @ApiPropertyOptional({ nullable: true }) minOrderQuantity: number | null = null;
  @ApiPropertyOptional({ nullable: true }) avgLeadTimeDays: number | null = null;
  @ApiPropertyOptional({ nullable: true }) overallRating: number | null = null;
  @ApiPropertyOptional({ nullable: true }) notes: string | null = null;
  @ApiProperty() createdAt: string = '';
  @ApiProperty() updatedAt: string = '';
}

export class SupplierListResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] }) items: SupplierResponseDto[] = [];
  @ApiProperty() total: number = 0;
  @ApiProperty() page: number = 1;
  @ApiProperty() limit: number = 20;
}
