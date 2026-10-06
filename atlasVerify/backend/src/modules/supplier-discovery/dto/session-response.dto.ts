import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierDiscoverySessionStatus, SupplierSourceProvider } from '../interfaces';

export class SupplierDiscoverySessionResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() workspaceId: string = '';
  @ApiProperty({ enum: SupplierSourceProvider }) provider: SupplierSourceProvider = SupplierSourceProvider.INDIAMART;
  @ApiProperty() keyword: string = '';
  @ApiProperty() country: string = 'IN';
  @ApiPropertyOptional({ nullable: true }) category: string | null = null;
  @ApiProperty({ enum: SupplierDiscoverySessionStatus }) status: SupplierDiscoverySessionStatus = SupplierDiscoverySessionStatus.PENDING;
  @ApiProperty() totalDiscovered: number = 0;
  @ApiProperty() newSuppliers: number = 0;
  @ApiProperty() duplicatesSkipped: number = 0;
  @ApiPropertyOptional({ nullable: true }) errorMessage: string | null = null;
  @ApiPropertyOptional({ nullable: true }) startedAt: string | null = null;
  @ApiPropertyOptional({ nullable: true }) completedAt: string | null = null;
  @ApiProperty() createdAt: string = '';
  @ApiProperty() updatedAt: string = '';
}

export class SupplierDiscoverySessionListResponseDto {
  @ApiProperty({ type: [SupplierDiscoverySessionResponseDto] }) items: SupplierDiscoverySessionResponseDto[] = [];
  @ApiProperty() total: number = 0;
  @ApiProperty() page: number = 1;
  @ApiProperty() limit: number = 20;
}
