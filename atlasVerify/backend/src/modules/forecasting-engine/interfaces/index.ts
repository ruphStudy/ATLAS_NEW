export enum ForecastType {
  DEMAND = 'demand',
  SALES = 'sales',
  REVENUE = 'revenue',
  PROFIT = 'profit',
  INVENTORY = 'inventory',
  REORDER = 'reorder',
  PROCUREMENT = 'procurement',
  CAPACITY = 'capacity',
}

export enum ForecastScope {
  PRODUCT = 'product',
  SKU = 'sku',
  VARIANT = 'variant',
  CATEGORY = 'category',
  SUPPLIER = 'supplier',
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  COUNTRY = 'country',
  REGION = 'region',
}

export enum ForecastHorizon {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export enum ForecastStrategy {
  MOVING_AVERAGE = 'moving_average',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  SEASONAL_DECOMPOSITION = 'seasonal_decomposition',
  TREND_PROJECTION = 'trend_projection',
  ML_REGRESSION = 'ml_regression',
  ENSEMBLE = 'ensemble',
}

export enum ForecastStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STALE = 'stale',
}

export enum ForecastTrigger {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  BULK = 'bulk',
}

export enum ForecastEventType {
  FORECAST_REQUESTED = 'forecast_requested',
  FORECAST_STARTED = 'forecast_started',
  FORECAST_COMPLETED = 'forecast_completed',
  FORECAST_FAILED = 'forecast_failed',
  BACKTEST_STARTED = 'backtest_started',
  BACKTEST_COMPLETED = 'backtest_completed',
  ACCURACY_THRESHOLD_BREACH = 'accuracy_threshold_breach',
  ANOMALY_DETECTED = 'anomaly_detected',
  FORECAST_INVALIDATED = 'forecast_invalidated',
}

export interface IForecastDefinition {
  id: string;
  workspaceId: string;
  definitionKey: string;
  name: string;
  description?: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  horizon: ForecastHorizon;
  periodsAhead: number;
  historicalPeriods: number;
  includeSeasonality: boolean;
  includeTrends: boolean;
  includePromotions: boolean;
  includeExternalSignals: boolean;
  confidenceLevel: number;
  autoRefresh: boolean;
  refreshIntervalHours?: number;
  accuracyThreshold?: number;
  version: number;
  enabled: boolean;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForecastExecution {
  id: string;
  definitionId: string;
  workspaceId: string;
  definitionKey: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  status: ForecastStatus;
  trigger: ForecastTrigger;
  forecastStart: Date;
  forecastEnd: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  dataPointsUsed?: number;
  dataQualityScore?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForecastDataPoint {
  period: Date;
  value: number;
  lowerBound?: number;
  upperBound?: number;
  confidence: number;
}

export interface IForecastResult {
  id: string;
  executionId: string;
  definitionId: string;
  workspaceId: string;
  forecastType: ForecastType;
  scope: ForecastScope;
  scopeId: string;
  strategy: ForecastStrategy;
  horizon: ForecastHorizon;
  generatedAt: Date;
  dataPoints: IForecastDataPoint[];
  assumptions: {
    seasonalityDetected: boolean;
    trendDirection?: 'up' | 'down' | 'stable';
    outlierCount?: number;
    missingDataPercentage?: number;
  };
  dataQuality: {
    completeness: number;
    consistency: number;
    reliability: number;
    overallScore: number;
  };
  version: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IBacktestResult {
  id: string;
  definitionId: string;
  executionId: string;
  workspaceId: string;
  testPeriodStart: Date;
  testPeriodEnd: Date;
  strategy: ForecastStrategy;
  metrics: {
    mae: number;
    mape: number;
    rmse: number;
    accuracy: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IForecastSnapshot {
  id: string;
  definitionId: string;
  executionId: string;
  workspaceId: string;
  definitionKey: string;
  version: number;
  result: IForecastResult;
  validUntil: Date;
  createdAt: Date;
}

export interface IForecastEventPayload {
  event: ForecastEventType;
  workspaceId: string;
  definitionId?: string;
  definitionKey?: string;
  executionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
