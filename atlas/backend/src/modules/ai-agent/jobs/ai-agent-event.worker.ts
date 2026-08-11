import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IAgentEventPayload, AiAgentEvent } from '../interfaces';

@Processor('ai-agent-events')
export class AiAgentEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiAgentEventWorker.name);

  async process(job: Job<IAgentEventPayload>): Promise<void> {
    const { event, workspaceId, agentId, executionId } = job.data;

    this.logger.log(
      `Processing AI Agent event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiAgentEvent.AGENT_CREATED:
        await this.handleAgentCreated(job.data);
        break;
      case AiAgentEvent.AGENT_UPDATED:
        await this.handleAgentUpdated(job.data);
        break;
      case AiAgentEvent.AGENT_ACTIVATED:
        await this.handleAgentActivated(job.data);
        break;
      case AiAgentEvent.AGENT_DEACTIVATED:
        await this.handleAgentDeactivated(job.data);
        break;
      case AiAgentEvent.AGENT_ARCHIVED:
        await this.handleAgentArchived(job.data);
        break;
      case AiAgentEvent.EXECUTION_STARTED:
        await this.handleExecutionStarted(job.data);
        break;
      case AiAgentEvent.EXECUTION_COMPLETED:
        await this.handleExecutionCompleted(job.data);
        break;
      case AiAgentEvent.EXECUTION_FAILED:
        await this.handleExecutionFailed(job.data);
        break;
      case AiAgentEvent.EXECUTION_CANCELLED:
        await this.handleExecutionCancelled(job.data);
        break;
      case AiAgentEvent.TURN_COMPLETED:
        await this.handleTurnCompleted(job.data);
        break;
      case AiAgentEvent.WORKFLOW_STARTED:
        await this.handleWorkflowStarted(job.data);
        break;
      case AiAgentEvent.WORKFLOW_COMPLETED:
        await this.handleWorkflowCompleted(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleAgentCreated(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Agent created: ${payload.agentId}`);
  }

  private async handleAgentUpdated(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Agent updated: ${payload.agentId}`);
  }

  private async handleAgentActivated(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Agent activated: ${payload.agentId}`);
  }

  private async handleAgentDeactivated(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Agent deactivated: ${payload.agentId}`);
  }

  private async handleAgentArchived(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Agent archived: ${payload.agentId}`);
  }

  private async handleExecutionStarted(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Execution started: ${payload.executionId}`);
  }

  private async handleExecutionCompleted(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Execution completed: ${payload.executionId}`);
  }

  private async handleExecutionFailed(payload: IAgentEventPayload): Promise<void> {
    this.logger.warn(`Execution failed: ${payload.executionId}`);
  }

  private async handleExecutionCancelled(payload: IAgentEventPayload): Promise<void> {
    this.logger.log(`Execution cancelled: ${payload.executionId}`);
  }

  private async handleTurnCompleted(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Turn completed for execution: ${payload.executionId}`);
  }

  private async handleWorkflowStarted(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Workflow started: ${payload.executionId}`);
  }

  private async handleWorkflowCompleted(payload: IAgentEventPayload): Promise<void> {
    this.logger.debug(`Workflow completed: ${payload.executionId}`);
  }
}
