'use client';

import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { PageHeader } from '@/components/ui/page-header';
import { QueryErrorState, UnauthorizedState } from '@/components/ui/states';
import {
  useExecutiveOverview,
  useTaskDashboard,
  usePendingApprovals,
  useWorkspaceActivityFeed,
  useWorkspaceHealth,
  useSavedDashboards,
} from '@/hooks';
import { KpiSection } from '@/components/executive-dashboard/kpi-section';
import { AlertsPanel } from '@/components/executive-dashboard/alerts-panel';
import { InsightsPanel } from '@/components/executive-dashboard/insights-panel';
import { MarketplacePanel } from '@/components/executive-dashboard/marketplace-panel';
import { AiOperationsPanel } from '@/components/executive-dashboard/ai-operations-panel';
import { ApprovalsTasksPanel } from '@/components/executive-dashboard/approvals-tasks-panel';
import { ActivityTimelinePanel } from '@/components/executive-dashboard/activity-timeline';
import { HealthPanel } from '@/components/executive-dashboard/health-panel';
import { DashboardFilters, type DashboardFilterState } from '@/components/executive-dashboard/dashboard-filters';
import { DashboardViewControls } from '@/components/executive-dashboard/dashboard-view-controls';

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_FILTERS: DashboardFilterState = {
  startDate: isoDateDaysAgo(30),
  endDate: isoDateDaysAgo(0),
  marketplaceIds: [],
  currency: 'USD',
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilterState>(DEFAULT_FILTERS);
  const [activeDashboardId, setActiveDashboardId] = useState<string | null>(null);

  const { data: dashboards } = useSavedDashboards();

  useEffect(() => {
    if (!activeDashboardId) return;
    const dashboard = dashboards?.find((d) => d.id === activeDashboardId);
    if (dashboard) {
      setFilters((prev) => ({
        ...prev,
        marketplaceIds: (dashboard.filters?.['marketplaceIds'] as string[] | undefined) ?? prev.marketplaceIds,
        currency: (dashboard.filters?.['currency'] as string | undefined) ?? prev.currency,
        startDate: dashboard.dateRange?.start?.slice(0, 10) ?? prev.startDate,
        endDate: dashboard.dateRange?.end?.slice(0, 10) ?? prev.endDate,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboardId, dashboards]);

  const overviewFilters = useMemo(
    () => ({
      startDate: new Date(filters.startDate).toISOString(),
      endDate: new Date(filters.endDate).toISOString(),
      marketplaceIds: filters.marketplaceIds.length > 0 ? filters.marketplaceIds : undefined,
      currency: filters.currency,
    }),
    [filters],
  );

  const overview = useExecutiveOverview(overviewFilters, 5 * 60 * 1000);
  const taskDashboard = useTaskDashboard();
  const pendingApprovals = usePendingApprovals();
  const activityFeed = useWorkspaceActivityFeed(15);
  const health = useWorkspaceHealth();

  const isForbidden = isAxiosError(overview.error) && overview.error.response?.status === 403;

  if (isForbidden) {
    return (
      <div>
        <PageHeader title="Executive Dashboard" description="Your ATLAS command center." />
        <UnauthorizedState />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div>
        <PageHeader title="Executive Dashboard" description="Your ATLAS command center." />
        <QueryErrorState refetch={overview.refetch} description="We couldn't load the executive overview." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Executive Dashboard" description="Your ATLAS command center." />

      <DashboardViewControls dashboards={dashboards ?? []} activeDashboardId={activeDashboardId} onSelectDashboard={setActiveDashboardId} filters={filters} />

      <DashboardFilters
        filters={filters}
        onChange={setFilters}
        marketplaceOptions={overview.data?.marketplaceComparisons ?? []}
        generatedAt={overview.data?.generatedAt}
        isFetching={overview.isFetching}
        onRefresh={() => overview.refetch()}
      />

      <div className="space-y-6">
        <KpiSection kpis={overview.data?.kpis ?? []} currency={filters.currency} loading={overview.isLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AlertsPanel alerts={overview.data?.alerts ?? []} loading={overview.isLoading} />
          <InsightsPanel insights={overview.data?.insights ?? []} loading={overview.isLoading} />
        </div>

        <MarketplacePanel comparisons={overview.data?.marketplaceComparisons ?? []} currency={filters.currency} loading={overview.isLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <AiOperationsPanel summary={overview.data?.aiOperations} currency={filters.currency} loading={overview.isLoading} />
          <HealthPanel dashboard={health.data} loading={health.isLoading} />
        </div>

        <ApprovalsTasksPanel
          approvals={pendingApprovals.data?.data ?? []}
          overdueTasks={taskDashboard.data?.overdueTasks ?? []}
          loadingApprovals={pendingApprovals.isLoading}
          loadingTasks={taskDashboard.isLoading}
        />

        <ActivityTimelinePanel entries={activityFeed.data?.data ?? []} loading={activityFeed.isLoading} />
      </div>
    </div>
  );
}
