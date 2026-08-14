import { Injectable, Logger } from '@nestjs/common';
import { MultiChannelRepository } from '../repository/multi-channel.repository';
import { IChannel } from '../interfaces';

/**
 * MultiChannelAudit
 *
 * Writes versioned/lifecycle snapshots to the domain-specific
 * `ChannelHistory` table — mirrors `MultiBrandAudit`/`MultiBusinessAudit`.
 * Cross-cutting, compliance-oriented entries for workspace-scoped actions
 * are written separately by `MultiChannelService` to the central
 * `AuditLogsService`.
 */
@Injectable()
export class MultiChannelAudit {
  private readonly logger = new Logger(MultiChannelAudit.name);

  constructor(private readonly repository: MultiChannelRepository) {}

  async logChannelChange(channel: IChannel, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = channel;
      await this.repository.createChannelHistory({
        channelId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for channel '${channel.channelKey}': ${(err as Error).message}`);
    }
  }
}
