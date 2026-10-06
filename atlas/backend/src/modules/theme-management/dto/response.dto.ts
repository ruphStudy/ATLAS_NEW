import { ApiPropertyOptional } from '@nestjs/swagger';
import { ThemeScope, ThemeStatus } from '../interfaces';

export class ThemeResponseDto {
  id!: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope!: ThemeScope;
  key!: string;
  name!: string;
  description?: string | null;
  isSystem!: boolean;
  isBranded!: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  tokens: unknown;
  version!: number;
  status!: ThemeStatus;
  publishedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedThemeResponseDto {
  data!: ThemeResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ThemeHistoryResponseDto {
  id!: string;
  themeId!: string;
  @ApiPropertyOptional({ enum: ThemeStatus, nullable: true })
  fromStatus?: ThemeStatus | null;
  toStatus!: ThemeStatus;
  version!: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class ContrastWarningResponseDto {
  pair!: string;
  ratio!: number;
  minimumRequired!: number;
  mode!: 'light' | 'dark';
}

export class EffectiveThemeResponseDto {
  theme!: ThemeResponseDto;
  mode!: string;
  density!: string;
  source!: string;
}
