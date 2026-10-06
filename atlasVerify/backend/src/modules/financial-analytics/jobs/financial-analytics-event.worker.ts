import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IFinancialAnalyticsEvent, FinancialAnalyticsEventType } from '../interfaces';

@Processor('financial-analytics-events')
export class FinancialAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(FinancialAnalyticsEventWorker.name);

  async process(job: Job<IFinancialAnalyticsEvent>): Promise<void> {
    const { event, workspaceId, productId, marketplaceId } = job.data;

    this.logger.log(
      `Processing financial analytics event: ${event} for workspace ${workspaceId}`,
    );

    switch (event) {
      case FinancialAnalyticsEventType.PERFORMANCE_CALCULATED:
        await this.handlePerformanceCalculated(job.data);
        break;
      case FinancialAnalyticsEventType.TREND_UPDATED:
        await this.handleTrendUpdated(job.data);
        break;
      case FinancialAnalyticsEventType.COMPARISON_GENERATED:
        await this.handleComparisonGenerated(job.data);
        break;
      case FinancialAnalyticsEventType.PROFIT_LEAKAGE_DETECTED:
        await this.handleProfitLeakageDetected(job.data);
        break;
      case FinancialAnalyticsEventType.FEE_ANOMALY_DETECTED:
        await this.handleFeeAnomalyDetected(job.data);
        break;
      case FinancialAnalyticsEventType.SETTLEMENT_DELAY_DETECTED:
        await this.handleSettlementDelayDetected(job.data);
        break;
      case FinancialAnalyticsEventType.LOSS_MAKING_PRODUCT_DETECTED:
        await this.handleLossMakingProductDetected(job.data);
        break;
      case FinancialAnalyticsEventType.CASH_FLOW_RISK_DETECTED:
        await this.handleCashFlowRiskDetected(job.data);
        break;
      default:
        this.logger.warn(`Unknown event type: ${event}`);
    }
  }

  private async handlePerformanceCalculated(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.debug(`Performance calculated for workspace ${event.workspaceId}`);
  }

  private async handleTrendUpdated(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.debug(`Trend updated for workspace ${event.workspaceId}`);
  }

  private async handleComparisonGenerated(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.debug(`Comparison generated for workspace ${event.workspaceId}`);
  }

  private async handleProfitLeakageDetected(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Profit leakage detected for marketplace ${event.marketplaceId}: ${event.amount} ${event.currency}`,
    );
  }

  private async handleFeeAnomalyDetected(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.warn(
      `Fee anomaly detected for marketplace ${event.marketplaceId}: ${event.amount} ${event.currency}`,
    );
  }

  private async handleSettlementDelayDetected(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Settlement delay detected for marketplace ${event.marketplaceId}: ${JSON.stringify(event.metadata)}`,
    );
  }

  private async handleLossMakingProductDetected(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Loss-making product detected: ${event.productId} (${event.productSku}): ${event.amount} ${event.currency}`,
    );
  }

  private async handleCashFlowRiskDetected(event: IFinancialAnalyticsEvent): Promise<void> {
    this.logger.error(
      `Cash flow risk detected for marketplace ${event.marketplaceId}: ${event.amount} ${event.currency}`,
    );
  }
}
