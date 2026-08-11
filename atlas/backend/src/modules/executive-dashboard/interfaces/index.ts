export enum ExecutiveMetricCategory {
  REVENUE = 'revenue',
  PROFIT = 'profit',
  ORDERS = 'orders',
  PRODUCTS = 'products',
  SUPPLIERS = 'suppliers',
  INVENTORY = 'inventory',
  PROCUREMENT = 'procurement',
  WAREHOUSE = 'warehouse',
  MARKETPLACE = 'marketplace',
  AI_OPERATIONS = 'ai_operations',
}

export enum TrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export interface IExecutiveKpi {
  id: string;
  workspaceId: string;
  category: ExecutiveMetricCategory;
  metricKey: string;
  name: string;
  currentValue: number;
  targetValue?: number;
  previousValue?: number;
  variance?: number;
  variancePercent?: number;
  trendDirection: TrendDirection;
  unit?: string;
  period: string;
  updatedAt: Date;
}

export interface IExecutiveSummary {
  category: ExecutiveMetricCategory;
  metrics: Record<string, number>;
  trends: Record<string, TrendDirection>;
  alerts: number;
  lastUpdated: Date;
}

export interface IExecutiveAlert {
  id: string;
  workspaceId: string;
  severity: AlertSeverity;
  category: ExecutiveMetricCategory;
  title: string;
  description: string;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IExecutiveInsight {
  category: ExecutiveMetricCategory;
  insightType: string;
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceComparison {
  marketplaceId: string;
  marketplaceName: string;
  provider: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  fulfillmentRate: number;
  returnRate: number;
  revenueGrowth: number;
}

export interface IAiOperationsSummary {
  totalRequests: number;
  successRate: number;
  totalCost: number;
  averageLatency: number;
  topModels: Array<{
    modelKey: string;
    requests: number;
    cost: number;
  }>;
  costSavings: number;
  failureRate: number;
  recommendationCount: number;
}

export interface IExecutiveDashboardFilters {
  workspaceId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  marketplaceIds?: string[];
  accountIds?: string[];
  warehouseIds?: string[];
  categoryIds?: string[];
  currency?: string;
  comparisonPeriod?: {
    start: Date;
    end: Date;
  };
}
