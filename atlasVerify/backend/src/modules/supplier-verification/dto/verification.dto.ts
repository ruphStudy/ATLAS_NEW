import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { VerificationStatus } from '../interfaces';

export class StartVerificationDto {
  @ApiPropertyOptional({ example: 'High-priority supplier for review' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ManualOverrideDto {
  @ApiProperty({ enum: VerificationStatus, example: VerificationStatus.VERIFIED })
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;

  @ApiProperty({ example: 'Manually verified by manager after call with supplier' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class VerificationFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({ example: 'supplier-uuid' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
