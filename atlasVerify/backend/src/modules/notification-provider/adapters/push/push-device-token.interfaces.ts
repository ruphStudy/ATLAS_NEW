export enum PushPlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export enum PushDeviceTokenStatus {
  ACTIVE = 'ACTIVE',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
}

/** How a push send's recipients are resolved to concrete device tokens. */
export enum PushTargetType {
  DEVICE = 'DEVICE',
  USER = 'USER',
  TOPIC = 'TOPIC',
  SEGMENT = 'SEGMENT',
  PLATFORM = 'PLATFORM',
}

export interface IPushDeviceToken {
  id: string;
  workspaceId: string;
  userId?: string | null;
  platform: PushPlatform;
  token: string;
  providerKey?: string | null;
  status: PushDeviceTokenStatus;
  topics: string[];
  lastSeenAt?: Date | null;
  lastRefreshedAt?: Date | null;
  invalidatedAt?: Date | null;
  invalidReason?: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
