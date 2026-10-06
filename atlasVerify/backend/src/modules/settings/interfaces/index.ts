export enum SettingValueType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  JSON = 'JSON',
  SECRET_REF = 'SECRET_REF',
  LIST = 'LIST',
}

export enum SettingScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
  MODULE = 'MODULE',
  USER = 'USER',
}

export enum SettingDefinitionStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum SettingValueStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum SettingsEvent {
  DEFINITION_CREATED = 'settings.definition_created',
  DEFINITION_UPDATED = 'settings.definition_updated',
  DEFINITION_DEPRECATED = 'settings.definition_deprecated',
  DEFINITION_ARCHIVED = 'settings.definition_archived',
  VALUE_CREATED = 'settings.value_created',
  VALUE_UPDATED = 'settings.value_updated',
  VALUE_PUBLISHED = 'settings.value_published',
  VALUE_ENABLED = 'settings.value_enabled',
  VALUE_DISABLED = 'settings.value_disabled',
  VALUE_ARCHIVED = 'settings.value_archived',
  VALUE_RESET = 'settings.value_reset',
  VALUE_ROLLED_BACK = 'settings.value_rolled_back',
}

/** Precedence order used by resolution — later entries win over earlier ones. */
export const SETTING_SCOPE_PRECEDENCE: SettingScope[] = [
  SettingScope.GLOBAL,
  SettingScope.ORGANIZATION,
  SettingScope.WORKSPACE,
  SettingScope.MODULE,
  SettingScope.USER,
];

export interface ISettingDefinition {
  id: string;
  key: string;
  category: string;
  label: string;
  description?: string | null;
  valueType: SettingValueType;
  defaultValue?: unknown;
  enumOptions: string[];
  allowedScopes: SettingScope[];
  validationRules?: unknown;
  dependencies?: unknown;
  module?: string | null;
  isSecretRef: boolean;
  visibilityCondition?: unknown;
  status: SettingDefinitionStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ISettingValue {
  id: string;
  definitionKey: string;
  scope: SettingScope;
  workspaceId?: string | null;
  organizationId?: string | null;
  moduleKey?: string | null;
  userId?: string | null;
  scopeKey: string;
  value: unknown;
  status: SettingValueStatus;
  version: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ISettingValueHistory {
  id: string;
  settingValueId: string;
  definitionKey: string;
  workspaceId?: string | null;
  fromValue?: unknown;
  toValue: unknown;
  fromStatus?: SettingValueStatus | null;
  toStatus: SettingValueStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ISettingsEventPayload {
  event: SettingsEvent;
  definitionKey: string;
  workspaceId?: string;
  scope?: SettingScope;
  moduleKey?: string;
  userId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/** Identifies the caller's resolution context — which scope tiers apply to them. */
export interface ISettingsResolutionContext {
  workspaceId: string;
  organizationId?: string;
  moduleKey?: string;
  userId?: string;
}

export interface IResolvedSetting {
  key: string;
  value: unknown;
  source: SettingScope | 'DEFAULT';
  valueType: SettingValueType;
}
