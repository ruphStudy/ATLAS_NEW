import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IWorkflowEventPayload, AiWorkflowEvent } from '../interfaces';

@Processor('ai-workflow-events')
export class AiWorkflowEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiWorkflowEventWorker.name);

  async process(job: Job<IWorkflowEventPayload>): Promise<void> {
    const { event, workspaceId, workflowId, executionId } = job.data;

    this.logger.log(
      `Processing AI Workflow event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiWorkflowEvent.WORKFLOW_CREATED:
        await this.handleWorkflowCreated(job.data);
        break;
      case AiWorkflowEvent.WORKFLOW_UPDATED:
        await this.handleWorkflowUpdated(job.data);
        break;
      case AiWorkflowEvent.WORKFLOW_PUBLISHED:
        await this.handleWorkflowPublished(job.data);
        break;
      case AiWorkflowEvent.WORKFLOW_PAUSED:
        await this.handleWorkflowPaused(job.data);
        break;
      case AiWorkflowEvent.WORKFLOW_RESUMED:
        await this.handleWorkflowResumed(job.data);
        break;
      case AiWorkflowEvent.WORKFLOW_ARCHIVED:
        await this.handleWorkflowArchived(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_STARTED:
        await this.handleExecutionStarted(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_STEP_STARTED:
        await this.handleExecutionStepStarted(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_STEP_COMPLETED:
        await this.handleExecutionStepCompleted(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_STEP_FAILED:
        await this.handleExecutionStepFailed(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_COMPLETED:
        await this.handleExecutionCompleted(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_FAILED:
        await this.handleExecutionFailed(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_CANCELLED:
        await this.handleExecutionCancelled(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_PAUSED:
        await this.handleExecutionPaused(job.data);
        break;
      case AiWorkflowEvent.EXECUTION_RESUMED:
        await this.handleExecutionResumed(job.data);
        break;
      case AiWorkflowEvent.COMPENSATION_EXECUTED:
        await this.handleCompensationExecuted(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleWorkflowCreated(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow created: ${payload.workflowId}`);
  }

  private async handleWorkflowUpdated(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow updated: ${payload.workflowId}`);
  }

  private async handleWorkflowPublished(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow published: ${payload.workflowId}`);
  }

  private async handleWorkflowPaused(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow paused: ${payload.workflowId}`);
  }

  private async handleWorkflowResumed(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow resumed: ${payload.workflowId}`);
  }

  private async handleWorkflowArchived(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Workflow archived: ${payload.workflowId}`);
  }

  private async handleExecutionStarted(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Execution started: ${payload.executionId}`);
  }

  private async handleExecutionStepStarted(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Execution step started: ${payload.stepId}`);
  }

  private async handleExecutionStepCompleted(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Execution step completed: ${payload.stepId}`);
  }

  private async handleExecutionStepFailed(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.warn(`Execution step failed: ${payload.stepId}`);
  }

  private async handleExecutionCompleted(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.debug(`Execution completed: ${payload.executionId}`);
  }

  private async handleExecutionFailed(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.warn(`Execution failed: ${payload.executionId}`);
  }

  private async handleExecutionCancelled(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.log(`Execution cancelled: ${payload.executionId}`);
  }

  private async handleExecutionPaused(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.log(`Execution paused: ${payload.executionId}`);
  }

  private async handleExecutionResumed(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.log(`Execution resumed: ${payload.executionId}`);
  }

  private async handleCompensationExecuted(payload: IWorkflowEventPayload): Promise<void> {
    this.logger.log(`Compensation executed for: ${payload.executionId}`);
  }
}
