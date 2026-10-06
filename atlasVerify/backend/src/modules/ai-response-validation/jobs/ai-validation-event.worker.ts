import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IValidationEventPayload, AiResponseValidationEvent } from '../interfaces';

@Processor('ai-validation-events')
export class AiValidationEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiValidationEventWorker.name);

  async process(job: Job<IValidationEventPayload>): Promise<void> {
    const { event, workspaceId, validationId } = job.data;

    this.logger.log(
      `Processing AI Validation event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiResponseValidationEvent.VALIDATION_STARTED:
        await this.handleValidationStarted(job.data);
        break;
      case AiResponseValidationEvent.VALIDATION_COMPLETED:
        await this.handleValidationCompleted(job.data);
        break;
      case AiResponseValidationEvent.VALIDATION_FAILED:
        await this.handleValidationFailed(job.data);
        break;
      case AiResponseValidationEvent.VALIDATION_REPAIRED:
        await this.handleValidationRepaired(job.data);
        break;
      case AiResponseValidationEvent.VALIDATION_REJECTED:
        await this.handleValidationRejected(job.data);
        break;
      case AiResponseValidationEvent.VALIDATOR_EXECUTED:
        await this.handleValidatorExecuted(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handleValidationStarted(payload: IValidationEventPayload): Promise<void> {
    this.logger.debug(`Validation started: ${payload.validationId}`);
  }

  private async handleValidationCompleted(payload: IValidationEventPayload): Promise<void> {
    this.logger.log(
      `Validation completed: ${payload.validationId} - Valid: ${payload.overallValid}`,
    );
  }

  private async handleValidationFailed(payload: IValidationEventPayload): Promise<void> {
    this.logger.warn(`Validation failed: ${payload.validationId}`);
  }

  private async handleValidationRepaired(payload: IValidationEventPayload): Promise<void> {
    this.logger.log(`Validation repaired: ${payload.validationId}`);
  }

  private async handleValidationRejected(payload: IValidationEventPayload): Promise<void> {
    this.logger.warn(`Validation rejected: ${payload.validationId}`);
  }

  private async handleValidatorExecuted(payload: IValidationEventPayload): Promise<void> {
    this.logger.debug(`Validator executed for: ${payload.validationId}`);
  }
}
