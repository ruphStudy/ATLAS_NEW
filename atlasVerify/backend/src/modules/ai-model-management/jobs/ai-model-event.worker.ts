import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiModelEventPayload } from './ai-model-event.queue';

@Processor('ai-model-events')
export class AiModelEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiModelEventWorker.name);

  async process(job: Job<AiModelEventPayload>): Promise<void> {
    this.logger.log(`Processing AI model event: ${job.name}`);

    const { event } = job.data;

    try {
      switch (event) {
        case 'ai-model.registered':
          await this.handleModelRegistered(job.data);
          break;
        case 'ai-model.updated':
          await this.handleModelUpdated(job.data);
          break;
        case 'ai-model.enabled':
          await this.handleModelEnabled(job.data);
          break;
        case 'ai-model.disabled':
          await this.handleModelDisabled(job.data);
          break;
        case 'ai-model.deprecated':
          await this.handleModelDeprecated(job.data);
          break;
        case 'ai-model.archived':
          await this.handleModelArchived(job.data);
          break;
        case 'ai-model.configuration_updated':
          await this.handleConfigurationUpdated(job.data);
          break;
        case 'ai-model.cache_invalidated':
          await this.handleCacheInvalidated(job.data);
          break;
        case 'ai-model.compatibility_validated':
          await this.handleCompatibilityValidated(job.data);
          break;
        case 'ai-model.resolved':
          await this.handleModelResolved(job.data);
          break;
        default:
          this.logger.warn(`Unknown AI model event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing AI model event ${event}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleModelRegistered(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(
      `Model registered: ${payload.provider}/${payload.modelKey}`,
    );
  }

  private async handleModelUpdated(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(`Model updated: ${payload.modelId}`);
  }

  private async handleModelEnabled(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(`Model enabled: ${payload.modelId}`);
  }

  private async handleModelDisabled(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(`Model disabled: ${payload.modelId}`);
  }

  private async handleModelDeprecated(payload: AiModelEventPayload): Promise<void> {
    this.logger.warn(`Model deprecated: ${payload.modelId}`);
  }

  private async handleModelArchived(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(`Model archived: ${payload.modelId}`);
  }

  private async handleConfigurationUpdated(
    payload: AiModelEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Configuration updated: ${payload.configurationId} for capability ${payload.capability}`,
    );
  }

  private async handleCacheInvalidated(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(`Model cache invalidated for workspace ${payload.workspaceId}`);
  }

  private async handleCompatibilityValidated(
    payload: AiModelEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Compatibility validated for model ${payload.modelId} with capability ${payload.capability}`,
    );
  }

  private async handleModelResolved(payload: AiModelEventPayload): Promise<void> {
    this.logger.log(
      `Model resolved: ${payload.modelId} for capability ${payload.capability}`,
    );
  }
}
