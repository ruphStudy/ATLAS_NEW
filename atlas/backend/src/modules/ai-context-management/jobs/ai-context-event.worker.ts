import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IContextEventPayload, AiContextEvent } from '../interfaces';

@Processor('ai-context-events')
export class AiContextEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiContextEventWorker.name);

  async process(job: Job<IContextEventPayload>): Promise<void> {
    const { event, workspaceId, contextId } = job.data;

    this.logger.log(
      `Processing AI Context event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiContextEvent.CONTEXT_CREATED:
        await this.handleContextCreated(job.data);
        break;
      case AiContextEvent.CONTEXT_UPDATED:
        await this.handleContextUpdated(job.data);
        break;
      case AiContextEvent.CONTEXT_MERGED:
        await this.handleContextMerged(job.data);
        break;
      case AiContextEvent.CONTEXT_SUMMARIZED:
        await this.handleContextSummarized(job.data);
        break;
      case AiContextEvent.CONTEXT_TRIMMED:
        await this.handleContextTrimmed(job.data);
        break;
      case AiContextEvent.CONTEXT_EXPIRED:
        await this.handleContextExpired(job.data);
        break;
      case AiContextEvent.CONTEXT_ARCHIVED:
        await this.handleContextArchived(job.data);
        break;
      case AiContextEvent.CONTEXT_BRANCHED:
        await this.handleContextBranched(job.data);
        break;
      case AiContextEvent.CONTEXT_HANDED_OFF:
        await this.handleContextHandedOff(job.data);
        break;
      case AiContextEvent.CONTEXT_ACCESSED:
        await this.handleContextAccessed(job.data);
        break;
      case AiContextEvent.CONTEXT_INVALIDATED:
        await this.handleContextInvalidated(job.data);
        break;
      case AiContextEvent.VERSION_CREATED:
        await this.handleVersionCreated(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleContextCreated(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context created: ${payload.contextId}`);
  }

  private async handleContextUpdated(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context updated: ${payload.contextId}`);
  }

  private async handleContextMerged(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context merged: ${payload.contextId}`);
  }

  private async handleContextSummarized(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context summarized: ${payload.contextId}`);
  }

  private async handleContextTrimmed(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context trimmed: ${payload.contextId}`);
  }

  private async handleContextExpired(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context expired: ${payload.contextId}`);
  }

  private async handleContextArchived(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context archived: ${payload.contextId}`);
  }

  private async handleContextBranched(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context branched: ${payload.contextId}`);
  }

  private async handleContextHandedOff(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context handed off: ${payload.contextId}`);
  }

  private async handleContextAccessed(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context accessed: ${payload.contextId}`);
  }

  private async handleContextInvalidated(payload: IContextEventPayload): Promise<void> {
    this.logger.log(`Context cache invalidated: ${payload.contextId}`);
  }

  private async handleVersionCreated(payload: IContextEventPayload): Promise<void> {
    this.logger.debug(`Context version created: ${payload.contextId} v${payload.version}`);
  }
}
