import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceCapabilityRepository } from '../repository/marketplace-capability.repository';
import { IMarketplaceCapabilityDefinition, IMarketplaceProviderCapabilityDeclaration } from '../interfaces';

@Injectable()
export class MarketplaceCapabilityAudit {
  private readonly logger = new Logger(MarketplaceCapabilityAudit.name);

  constructor(private readonly repository: MarketplaceCapabilityRepository) {}

  async logDefinitionChange(
    definition: IMarketplaceCapabilityDefinition,
    changeReason: string,
    changedBy?: string,
  ): Promise<void> {
    try {
      const { id, capabilityKey, version, status, deletedAt, createdBy, updatedBy, ...rest } = definition;
      await this.repository.createDefinitionHistory({
        definitionId: id,
        capabilityKey: capabilityKey.toUpperCase(),
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for capability '${definition.capabilityKey}': ${(err as Error).message}`);
    }
  }

  logEvent(
    event: string,
    capabilityKey: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logger.log({
      message: `Capability audit event`,
      event,
      capabilityKey,
      ...metadata,
    });
  }
}
