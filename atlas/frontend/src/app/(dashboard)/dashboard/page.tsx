'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, ShoppingCart, Boxes, ArrowRight, Sparkles } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/metric-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { ProductPerformance } from '@/components/dashboard/product-performance';

// ── Metric Cards Data ─────────────────────────────────────────
const metrics = [
  {
    label: 'Total Revenue',
    value: '$124,500',
    change: '+18.2%',
    trend: 'up' as const,
    icon: DollarSign,
    gradient: 'from-violet-500 to-purple-600',
    description: 'vs $105,300 last week',
  },
  {
    label: 'Net Profit',
    value: '$34,200',
    change: '+12.5%',
    trend: 'up' as const,
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-600',
    description: '27.5% margin',
  },
  {
    label: 'Total Orders',
    value: '1,847',
    change: '+24.1%',
    trend: 'up' as const,
    icon: ShoppingCart,
    gradient: 'from-blue-500 to-indigo-600',
    description: '389 today',
  },
  {
    label: 'Active SKUs',
    value: '4,392',
    change: '-2.3%',
    trend: 'down' as const,
    icon: Boxes,
    gradient: 'from-amber-500 to-orange-600',
    description: '87% healthy stock',
  },
];

// ── Dashboard Page ────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative overflow-hidden rounded-[var(--radius)] bg-gradient-brand p-6 text-white"
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute right-20 -bottom-8 h-32 w-32 rounded-full bg-white/8 blur-xl" />
        <div className="pointer-events-none absolute right-6 top-4 h-3 w-3 rounded-full bg-white/30" />
        <div className="pointer-events-none absolute right-16 top-10 h-2 w-2 rounded-full bg-white/20" />

        <div className="relative flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                AI Commerce OS
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Good morning, John 👋</h1>
            <p className="mt-1.5 text-sm text-white/80 max-w-md">
              Your store is performing <span className="font-semibold text-white">18% better</span>{' '}
              than last week. Revenue is on track to exceed the monthly target by{' '}
              <span className="font-semibold text-white">$23K</span>.
            </p>

            <div className="mt-5 flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-xl bg-white text-violet-700 px-4 py-2 text-sm font-semibold hover:bg-white/95 transition-colors shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Run AI Analysis
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur text-white px-4 py-2 text-sm font-semibold hover:bg-white/25 transition-colors"
              >
                View Full Report
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="hidden lg:grid grid-cols-2 gap-3 shrink-0">
            {[
              { label: 'Buy Box Win Rate', value: '87%' },
              { label: 'Avg. Response Time', value: '2.4h' },
              { label: 'Active Listings', value: '1,204' },
              { label: 'Suppressed', value: '12' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 px-4 py-3 text-center">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-white/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <QuickActions />

      {/* ── Metric Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <MetricCard key={metric.label} {...metric} index={i + 1} />
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <RevenueChart />
        <AIInsightsPanel />
      </div>

      {/* ── Bottom Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <ProductPerformance />
        <ActivityFeed />
      </div>
    </div>
  );
}
