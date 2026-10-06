import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationCheckStatus, VerificationStatus } from '../interfaces';

export class CheckResultResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() verificationId: string = '';
  @ApiProperty() checkName: string = '';
  @ApiProperty({ enum: VerificationCheckStatus }) status: VerificationCheckStatus = VerificationCheckStatus.SKIPPED;
  @ApiProperty() weight: number = 0;
  @ApiProperty() score: number = 0;
  @ApiPropertyOptional({ nullable: true }) message: string | null = null;
  @ApiProperty() details: Record<string, unknown> = {};
  @ApiPropertyOptional({ nullable: true }) executedAt: string | null = null;
  @ApiProperty() createdAt: string = '';
}

export class VerificationResponseDto {
  @ApiProperty() id: string = '';
  @ApiProperty() workspaceId: string = '';
  @ApiProperty() supplierId: string = '';
  @ApiProperty({ enum: VerificationStatus }) status: VerificationStatus = VerificationStatus.PENDING;
  @ApiPropertyOptional({ nullable: true }) score: number | null = null;
  @ApiProperty() scoreThreshold: number = 70;
  @ApiProperty() isLatest: boolean = true;
  @ApiPropertyOptional({ nullable: true }) overrideNotes: string | null = null;
  @ApiPropertyOptional({ nullable: true }) overriddenBy: string | null = null;
  @ApiPropertyOptional({ nullable: true }) overriddenAt: string | null = null;
  @ApiPropertyOptional({ nullable: true }) completedAt: string | null = null;
  @ApiProperty() createdAt: string = '';
  @ApiProperty() updatedAt: string = '';
}

export class VerificationWithChecksResponseDto extends VerificationResponseDto {
  @ApiProperty({ type: [CheckResultResponseDto] })
  checkResults: CheckResultResponseDto[] = [];
}

export class VerificationListResponseDto {
  @ApiProperty({ type: [VerificationResponseDto] }) items: VerificationResponseDto[] = [];
  @ApiProperty() total: number = 0;
  @ApiProperty() page: number = 1;
  @ApiProperty() limit: number = 20;
}
