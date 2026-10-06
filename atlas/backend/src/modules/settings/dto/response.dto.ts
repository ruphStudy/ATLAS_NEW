import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  SettingValueType,
  SettingScope,
  SettingDefinitionStatus,
  SettingValueStatus,
} from '../interfaces';

export class SettingDefinitionResponseDto {
  id!: string;
  key!: string;
  category!: string;
  label!: string;
  description?: string | null;
  valueType!: SettingValueType;
  defaultValue?: unknown;
  enumOptions!: string[];
  allowedScopes!: SettingScope[];
  validationRules?: unknown;
  dependencies?: unknown;
  module?: string | null;
  isSecretRef!: boolean;
  visibilityCondition?: unknown;
  status!: SettingDefinitionStatus;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedSettingDefinitionResponseDto {
  data!: SettingDefinitionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SettingValueResponseDto {
  id!: string;
  definitionKey!: string;
  scope!: SettingScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  moduleKey?: string | null;
  userId?: string | null;
  value: unknown;
  status!: SettingValueStatus;
  version!: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedSettingValueResponseDto {
  data!: SettingValueResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SettingValueHistoryResponseDto {
  id!: string;
  settingValueId!: string;
  definitionKey!: string;
  fromValue?: unknown;
  toValue: unknown;
  @ApiPropertyOptional({ enum: SettingValueStatus, nullable: true })
  fromStatus?: SettingValueStatus | null;
  toStatus!: SettingValueStatus;
  version!: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class ResolvedSettingResponseDto {
  key!: string;
  value: unknown;
  source!: SettingScope | 'DEFAULT';
  valueType!: SettingValueType;
}
