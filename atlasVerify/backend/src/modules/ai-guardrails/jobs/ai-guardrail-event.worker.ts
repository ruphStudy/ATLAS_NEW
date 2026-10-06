import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IGuardrailEventPayload, AiGuardrailEvent } from '../interfaces';

@Processor(QUEUE_NAMES.AI_GUARDRAIL_EVENTS)
export class AiGuardrailEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiGuardrailEventWorker.name);

  async process(job: Job<IGuardrailEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(
      `Processing AI Guardrail event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiGuardrailEvent.RULE_CREATED:
      case AiGuardrailEvent.RULE_UPDATED:
      case AiGuardrailEvent.RULE_DELETED:
        this.logger.debug(`Rule event: ${event} (${job.data.ruleId})`);
        break;
      case AiGuardrailEvent.OVERRIDE_CREATED:
      case AiGuardrailEvent.OVERRIDE_UPDATED:
      case AiGuardrailEvent.OVERRIDE_DELETED:
        this.logger.debug(`Override event: ${event} (${job.data.overrideId})`);
        break;
      case AiGuardrailEvent.EVALUATION_COMPLETED:
        this.logger.debug(`Evaluation completed: ${job.data.evaluationId}`);
        break;
      case AiGuardrailEvent.EVALUATION_BLOCKED:
        this.logger.warn(`Evaluation blocked: ${job.data.evaluationId}`);
        break;
      case AiGuardrailEvent.EVALUATION_WARNED:
        this.logger.warn(`Evaluation warned: ${job.data.evaluationId}`);
        break;
      case AiGuardrailEvent.INCIDENT_REPORTED:
        this.logger.warn(`Safety incident reported: ${job.data.incidentId}`);
        break;
      case AiGuardrailEvent.INCIDENT_UPDATED:
        this.logger.debug(`Incident updated: ${job.data.incidentId}`);
        break;
      case AiGuardrailEvent.APPROVAL_REQUESTED:
        this.logger.warn(`Human approval requested: ${job.data.approvalId}`);
        break;
      case AiGuardrailEvent.APPROVAL_DECIDED:
        this.logger.log(`Approval decided: ${job.data.approvalId}`);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
