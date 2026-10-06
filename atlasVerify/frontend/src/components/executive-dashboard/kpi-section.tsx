'use client';

import { DollarSign, TrendingUp, ShoppingCart, Package, Building2, Boxes, ClipboardList, Warehouse, Store, Sparkles, type LucideIcon } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card';
import { formatCurrency } from '@/lib/utils';
import type { ExecutiveKpi, ExecutiveMetricCategory } from '@/types';

const CATEGORY_ICON: Record<ExecutiveMetricCategory, LucideIcon> = {
  revenue: DollarSign,
  profit: TrendingUp,
  orders: ShoppingCart,
  products: Package,
  suppliers: Building2,
  inventory: Boxes,
  procurement: ClipboardList,
  warehouse: Warehouse,
  marketplace: Store,
  ai_operations: Sparkles,
};

const CATEGORY_GRADIENT: Record<ExecutiveMetricCategory, string> = {
  revenue: 'from-violet-500 to-purple-600',
  profit: 'from-emerald-500 to-teal-600',
  orders: 'from-blue-500 to-indigo-600',
  products: 'from-amber-500 to-orange-600',
  suppliers: 'from-cyan-500 to-sky-600',
  inventory: 'from-rose-500 to-pink-600',
  procurement: 'from-lime-500 to-green-600',
  warehouse: 'from-slate-500 to-gray-600',
  marketplace: 'from-fuchsia-500 to-purple-600',
  ai_operations: 'from-indigo-500 to-violet-600',
};

const CURRENCY_CATEGORIES: ExecutiveMetricCategory[] = ['revenue', 'profit', 'ai_operations'];

function formatKpiValue(kpi: ExecutiveKpi, currency: string): string {
  if (CURRENCY_CATEGORIES.includes(kpi.category)) {
    return formatCurrency(kpi.currentValue, currency);
  }
  if (kpi.unit === '%') return `${kpi.currentValue.toFixed(1)}%`;
  return new Intl.NumberFormat('en-US').format(kpi.currentValue) + (kpi.unit ? ` ${kpi.unit}` : '');
}

export function KpiSection({ kpis, currency, loading }: { kpis: ExecutiveKpi[]; currency: string; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCard key={i} label="" value="" loading />
        ))}
      </div>
    );
  }

  if (kpis.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.id}
          label={kpi.name}
          value={formatKpiValue(kpi, currency)}
          trend={kpi.trendDirection === 'up' ? 'up' : kpi.trendDirection === 'down' ? 'down' : 'neutral'}
          change={kpi.variancePercent !== undefined ? `${kpi.variancePercent > 0 ? '+' : ''}${kpi.variancePercent.toFixed(1)}%` : undefined}
          icon={CATEGORY_ICON[kpi.category]}
          gradient={CATEGORY_GRADIENT[kpi.category]}
          description={kpi.period}
        />
      ))}
    </div>
  );
}
