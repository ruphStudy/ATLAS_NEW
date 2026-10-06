// Maps to the OpportunityStatus Prisma enum defined in schema.prisma
export enum OpportunityStatus {
  DISCOVERED = 'DISCOVERED',
  ANALYZING = 'ANALYZING',
  VALIDATED = 'VALIDATED',
  IN_PROGRESS = 'IN_PROGRESS',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export interface IOpportunity {
  id: string;
  workspaceId: string;
  keyword: string;
  marketplace: string;
  country: string;
  category: string | null;
  demandScore: number | null;
  competitionScore: number | null;
  supplierScore: number | null;
  profitScore: number | null;
  aiScore: number | null;
  finalScore: number | null;
  recommendation: string | null;
  status: OpportunityStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IOpportunityListResult {
  items: IOpportunity[];
  total: number;
  page: number;
  limit: number;
}
