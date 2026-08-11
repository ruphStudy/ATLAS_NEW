import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IPromptEventPayload, AiPromptEvent } from '../interfaces';

@Processor('ai-prompt-events')
export class AiPromptEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiPromptEventWorker.name);

  async process(job: Job<IPromptEventPayload>): Promise<void> {
    const { event, workspaceId, promptId } = job.data;

    this.logger.log(
      `Processing AI Prompt event: ${event} for prompt ${promptId}`,
    );

    switch (event) {
      case AiPromptEvent.PROMPT_CREATED:
        await this.handlePromptCreated(job.data);
        break;
      case AiPromptEvent.PROMPT_UPDATED:
        await this.handlePromptUpdated(job.data);
        break;
      case AiPromptEvent.PROMPT_PUBLISHED:
        await this.handlePromptPublished(job.data);
        break;
      case AiPromptEvent.PROMPT_DEPRECATED:
        await this.handlePromptDeprecated(job.data);
        break;
      case AiPromptEvent.PROMPT_ARCHIVED:
        await this.handlePromptArchived(job.data);
        break;
      case AiPromptEvent.PROMPT_RESOLVED:
        await this.handlePromptResolved(job.data);
        break;
      case AiPromptEvent.VERSION_CREATED:
        await this.handleVersionCreated(job.data);
        break;
      case AiPromptEvent.ROLLBACK_EXECUTED:
        await this.handleRollbackExecuted(job.data);
        break;
      case AiPromptEvent.CACHE_INVALIDATED:
        await this.handleCacheInvalidated(job.data);
        break;
      case AiPromptEvent.USAGE_TRACKED:
        await this.handleUsageTracked(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handlePromptCreated(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt created: ${payload.promptId}`);
  }

  private async handlePromptUpdated(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt updated: ${payload.promptId}`);
  }

  private async handlePromptPublished(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt published: ${payload.promptId}`);
  }

  private async handlePromptDeprecated(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt deprecated: ${payload.promptId}`);
  }

  private async handlePromptArchived(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt archived: ${payload.promptId}`);
  }

  private async handlePromptResolved(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt resolved: ${payload.promptId}`);
  }

  private async handleVersionCreated(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(
      `Prompt version created: ${payload.promptId} v${payload.version}`,
    );
  }

  private async handleRollbackExecuted(payload: IPromptEventPayload): Promise<void> {
    this.logger.log(
      `Prompt rollback executed: ${payload.promptId} to v${payload.version}`,
    );
  }

  private async handleCacheInvalidated(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug('Prompt cache invalidated');
  }

  private async handleUsageTracked(payload: IPromptEventPayload): Promise<void> {
    this.logger.debug(`Prompt usage tracked: ${payload.promptId}`);
  }
}
