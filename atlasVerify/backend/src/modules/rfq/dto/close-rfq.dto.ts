import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelRfqDto {
  @ApiProperty({ example: 'Sourcing strategy changed' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class CloseRfqDto {
  @ApiPropertyOptional({ example: 'Selected supplier: Acme Ltd.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
