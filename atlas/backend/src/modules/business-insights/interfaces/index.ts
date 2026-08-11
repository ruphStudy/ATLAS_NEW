export enum InsightDomain {
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  PROCUREMENT = 'procurement',
  PRICING = 'pricing',
  MARKETPLACE = 'marketplace',
  INVENTORY = 'inventory',
  WAREHOUSE = 'warehouse',
  SALES = 'sales',
  PROFIT = 'profit',
  AI = 'ai',
}

export enum InsightType {
  TREND = 'trend',
  RISK = 'risk',
  OPPORTUNITY = 'opportunity',
  EXCEPTION = 'exception',
  ROOT_CAUSE = 'root_cause',
  PERFORMANCE_GAP = 'performance_gap',
}

export enum InsightPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum InsightStatus {
  NEW = 'new',
  REVIEWED = 'reviewed',
  ACCEPTED = 'accepted',
  DISMISSED = 'dismissed',
  RESOLVED = 'resolved',
  EXPIRED = 'expired',
}

export enum InsightStrategy {
  RULE_BASED = 'rule_based',
  ANALYTICS_BASED = 'analytics_based',
  AI_ASSISTED = 'ai_assisted',
  HYBRID = 'hybrid',
}

export enum InsightEventType {
  INSIGHT_GENERATED = 'insight_generated',
  INSIGHT_REVIEWED = 'insight_reviewed',
  INSIGHT_ACCEPTED = 'insight_accepted',
  INSIGHT_DISMISSED = 'insight_dismissed',
  INSIGHT_RESOLVED = 'insight_resolved',
  INSIGHT_EXPIRED = 'insight_expired',
  PRIORITY_CHANGED = 'priority_changed',
  DUPLICATE_DETECTED = 'duplicate_detected',
  OUTCOME_RECORDED = 'outcome_recorded',
}

export interface IInsightEvidence {
  sourceType: string;
  sourceId: string;
  metric?: string;
  value: any;
  threshold?: number;
  deviation?: number;
  timestamp: Date;
}

export interface IInsightImpact {
  revenue?: number;
  cost?: number;
  margin?: number;
  quantity?: number;
  customMetrics?: Record<string, number>;
}

export interface IRecommendedAction {
  title: string;
  description: string;
  targetModule: string;
  actionType: string;
  parameters?: Record<string, any>;
}

export interface IAffectedEntity {
  entityType: string;
  entityId: string;
  entityName?: string;
}

export interface IInsight {
  id: string;
  workspaceId: string;
  insightKey: string;
  domain: InsightDomain;
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  strategy: InsightStrategy;
  title: string;
  summary: string;
  evidence: IInsightEvidence[];
  impact?: IInsightImpact;
  confidence: number;
  recommendedActions: IRecommendedAction[];
  affectedEntities: IAffectedEntity[];
  version: number;
  sourceSnapshot?: Record<string, any>;
  validUntil?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  acceptedBy?: string;
  acceptedAt?: Date;
  dismissedBy?: string;
  dismissedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  feedback?: string;
  ownerId?: string;
  dueDate?: Date;
  actionReferences?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInsightHistory {
  id: string;
  insightId: string;
  workspaceId: string;
  version: number;
  previousStatus: InsightStatus;
  newStatus: InsightStatus;
  previousPriority?: InsightPriority;
  newPriority?: InsightPriority;
  changeReason?: string;
  changedBy?: string;
  changedAt: Date;
}

export interface IInsightOutcome {
  id: string;
  insightId: string;
  workspaceId: string;
  actualImpact?: IInsightImpact;
  actionsTaken: string[];
  resultSummary: string;
  successRate?: number;
  recordedBy?: string;
  recordedAt: Date;
}

export interface IInsightRanking {
  insightId: string;
  score: number;
  factors: {
    priorityWeight: number;
    confidenceWeight: number;
    impactWeight: number;
    freshnessWeight: number;
  };
}

export interface IInsightEventPayload {
  event: InsightEventType;
  workspaceId: string;
  insightId?: string;
  insightKey?: string;
  domain?: InsightDomain;
  type?: InsightType;
  priority?: InsightPriority;
  status?: InsightStatus;
  timestamp: Date;
  metadata?: Record<string, any>;
}
