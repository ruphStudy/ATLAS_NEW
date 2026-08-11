import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IForecastEventPayload, ForecastEventType } from '../interfaces';

@Processor('forecasting-events')
export class ForecastingEventWorker extends WorkerHost {
  private readonly logger = new Logger(ForecastingEventWorker.name);

  async process(job: Job<IForecastEventPayload>): Promise<void> {
    const { event, workspaceId, definitionId, definitionKey, executionId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, definition: ${definitionId || definitionKey}, execution: ${executionId}`,
    );

    try {
      switch (event) {
        case ForecastEventType.FORECAST_REQUESTED:
          await this.handleForecastRequested(job.data);
          break;
        case ForecastEventType.FORECAST_STARTED:
          await this.handleForecastStarted(job.data);
          break;
        case ForecastEventType.FORECAST_COMPLETED:
          await this.handleForecastCompleted(job.data);
          break;
        case ForecastEventType.FORECAST_FAILED:
          await this.handleForecastFailed(job.data);
          break;
        case ForecastEventType.BACKTEST_STARTED:
          await this.handleBacktestStarted(job.data);
          break;
        case ForecastEventType.BACKTEST_COMPLETED:
          await this.handleBacktestCompleted(job.data);
          break;
        case ForecastEventType.ACCURACY_THRESHOLD_BREACH:
          await this.handleAccuracyThresholdBreach(job.data);
          break;
        case ForecastEventType.ANOMALY_DETECTED:
          await this.handleAnomalyDetected(job.data);
          break;
        case ForecastEventType.FORECAST_INVALIDATED:
          await this.handleForecastInvalidated(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleForecastRequested(payload: IForecastEventPayload): Promise<void> {
    this.logger.debug(`Forecast requested: ${payload.definitionId}`);
  }

  private async handleForecastStarted(payload: IForecastEventPayload): Promise<void> {
    this.logger.debug(`Forecast started: ${payload.executionId}`);
  }

  private async handleForecastCompleted(payload: IForecastEventPayload): Promise<void> {
    this.logger.log(`Forecast completed: ${payload.executionId}`);
  }

  private async handleForecastFailed(payload: IForecastEventPayload): Promise<void> {
    this.logger.error(`Forecast failed: ${payload.executionId}`);
  }

  private async handleBacktestStarted(payload: IForecastEventPayload): Promise<void> {
    this.logger.debug(`Backtest started: ${payload.executionId}`);
  }

  private async handleBacktestCompleted(payload: IForecastEventPayload): Promise<void> {
    this.logger.log(`Backtest completed: ${payload.executionId}`);
  }

  private async handleAccuracyThresholdBreach(payload: IForecastEventPayload): Promise<void> {
    this.logger.warn(`Accuracy threshold breached for definition: ${payload.definitionId}`);
  }

  private async handleAnomalyDetected(payload: IForecastEventPayload): Promise<void> {
    this.logger.warn(`Anomaly detected in forecast: ${payload.executionId}`);
  }

  private async handleForecastInvalidated(payload: IForecastEventPayload): Promise<void> {
    this.logger.warn(`Forecast invalidated: ${payload.definitionId}`);
  }
}
