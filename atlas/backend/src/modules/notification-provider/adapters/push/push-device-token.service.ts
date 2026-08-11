import { Injectable, Logger } from '@nestjs/common';
import { PushDeviceTokenRepository } from './push-device-token.repository';
import { RegisterDeviceTokenDto, RefreshDeviceTokenDto, DeviceTokenFilterDto } from './push-device-token.dto';
import { IPushDeviceToken, PushDeviceTokenStatus, PushPlatform, PushTargetType } from './push-device-token.interfaces';
import {
  PushDeviceTokenNotFoundException,
  PushDeviceTokenNoTargetsResolvedException,
} from './push-device-token.exceptions';

@Injectable()
export class PushDeviceTokenService {
  private readonly logger = new Logger(PushDeviceTokenService.name);

  constructor(private readonly repository: PushDeviceTokenRepository) {}

  async register(dto: RegisterDeviceTokenDto): Promise<IPushDeviceToken> {
    return this.repository.upsert({
      workspaceId: dto.workspaceId,
      userId: dto.userId,
      platform: dto.platform,
      token: dto.token,
      providerKey: dto.providerKey,
      status: PushDeviceTokenStatus.ACTIVE,
      topics: dto.topics ?? [],
      lastSeenAt: new Date(),
      metadata: dto.metadata ?? {},
    });
  }

  async refresh(dto: RefreshDeviceTokenDto): Promise<IPushDeviceToken> {
    const existing = await this.repository.findByToken(dto.workspaceId, dto.oldToken);
    if (!existing) {
      throw new PushDeviceTokenNotFoundException(dto.oldToken.slice(-6));
    }

    return this.repository.update(existing.id, {
      token: dto.newToken,
      status: PushDeviceTokenStatus.ACTIVE,
      lastRefreshedAt: new Date(),
      invalidatedAt: null,
      invalidReason: null,
    });
  }

  /**
   * Marks a token invalid (e.g. provider reported it unregistered/expired)
   * so future sends to this target stop including it. Never throws if the
   * token isn't found — invalid-token feedback can race with the token
   * already having been removed/refreshed.
   */
  async markInvalid(workspaceId: string, token: string, reason?: string): Promise<void> {
    const existing = await this.repository.findByToken(workspaceId, token);
    if (!existing) return;

    await this.repository.update(existing.id, {
      status: PushDeviceTokenStatus.INVALID,
      invalidatedAt: new Date(),
      invalidReason: reason,
    });

    this.logger.debug(`Push device token marked invalid for workspace ${workspaceId}: ${reason ?? 'unspecified'}`);
  }

  /** Resolves a send target (device/user/topic/segment/platform) to concrete ACTIVE device tokens. */
  async resolveTargets(
    workspaceId: string,
    targetType: PushTargetType,
    targetValue: string,
    platform?: PushPlatform,
  ): Promise<IPushDeviceToken[]> {
    let tokens: IPushDeviceToken[];

    switch (targetType) {
      case PushTargetType.DEVICE: {
        const existing = await this.repository.findByToken(workspaceId, targetValue);
        if (existing && existing.status !== PushDeviceTokenStatus.ACTIVE) {
          throw new PushDeviceTokenNoTargetsResolvedException(targetType, targetValue);
        }
        // A raw, not-pre-registered token is still accepted — registration
        // is for topic/segment/user targeting and invalid-token tracking,
        // not a hard prerequisite for a direct DEVICE send.
        return [existing ?? ({ token: targetValue } as IPushDeviceToken)];
      }
      case PushTargetType.USER:
        tokens = await this.repository.findActiveByUserId(workspaceId, targetValue);
        break;
      case PushTargetType.TOPIC:
      case PushTargetType.SEGMENT:
        tokens = await this.repository.findActiveByTopic(workspaceId, targetValue);
        break;
      case PushTargetType.PLATFORM:
        tokens = await this.repository.findActiveByPlatform(workspaceId, targetValue as PushPlatform);
        break;
      default:
        tokens = [];
    }

    if (platform && targetType !== PushTargetType.PLATFORM) {
      tokens = tokens.filter((t) => t.platform === platform);
    }

    if (tokens.length === 0) {
      throw new PushDeviceTokenNoTargetsResolvedException(targetType, targetValue);
    }

    return tokens;
  }

  async findById(id: string, workspaceId: string): Promise<IPushDeviceToken> {
    const token = await this.repository.findById(id, workspaceId);
    if (!token) {
      throw new PushDeviceTokenNotFoundException(id);
    }
    return token;
  }

  async findAll(filter: DeviceTokenFilterDto): Promise<{
    data: IPushDeviceToken[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.findById(id, workspaceId);
    await this.repository.softDelete(id);
  }
}
