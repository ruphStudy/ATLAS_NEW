import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAiCostEventPayload, AiCostEvent } from '../interfaces';

@Processor(QUEUE_NAMES.AI_COST_EVENTS)
export class AiCostEventWorker extends WorkerHost {
  private readonly logger = new Logger(AiCostEventWorker.name);

  async process(job: Job<IAiCostEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;

    this.logger.log(
      `Processing AI Cost event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case AiCostEvent.PRICING_CONFIG_CREATED:
      case AiCostEvent.PRICING_CONFIG_UPDATED:
      case AiCostEvent.PRICING_CONFIG_DELETED:
        this.logger.debug(`Pricing config event: ${event} (${job.data.configId})`);
        break;
      case AiCostEvent.BUDGET_CREATED:
      case AiCostEvent.BUDGET_UPDATED:
      case AiCostEvent.BUDGET_DELETED:
        this.logger.debug(`Budget event: ${event} (${job.data.budgetId})`);
        break;
      case AiCostEvent.COST_RECORDED:
        this.logger.debug(
          `Cost recorded: ${job.data.costRecordId} amount=${job.data.amount} ${job.data.currency}`,
        );
        break;
      case AiCostEvent.BUDGET_WARNING:
        this.logger.warn(
          `Budget warning: ${job.data.budgetId} spend=${job.data.amount} ${job.data.currency}`,
        );
        break;
      case AiCostEvent.BUDGET_EXCEEDED:
        this.logger.warn(
          `Budget exceeded: ${job.data.budgetId} spend=${job.data.amount} ${job.data.currency}`,
        );
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }
}
