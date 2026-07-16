'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ── Placeholder Data ──────────────────────────────────────────
const data = [
  { date: 'Jul 7', revenue: 45200, profit: 12800, orders: 124 },
  { date: 'Jul 8', revenue: 52800, profit: 15400, orders: 156 },
  { date: 'Jul 9', revenue: 48900, profit: 13600, orders: 142 },
  { date: 'Jul 10', revenue: 67300, profit: 19800, orders: 198 },
  { date: 'Jul 11', revenue: 71200, profit: 20900, orders: 215 },
  { date: 'Jul 12', revenue: 84500, profit: 25100, orders: 267 },
  { date: 'Jul 13', revenue: 124500, profit: 34200, orders: 389 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  }).format(value);

// ── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as unknown[]).length) return null;

  const items = payload as Array<{ name: string; value: number; color: string }>;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-popover p-3 shadow-card-hover">
      <p className="text-xs font-semibold text-foreground mb-2">{label as string}</p>
      {items.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
export function RevenueChart() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const gridColor = isDark ? 'rgb(35 39 56)' : 'rgb(241 245 249)';
  const tickColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription className="mt-0.5">Last 7 days performance</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-semibold text-success">+18.2% vs prior week</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="mt-4 flex gap-1 rounded-[var(--radius)] bg-muted p-1 w-fit">
            {['Revenue', 'Profit', 'Orders'].map((tab, i) => (
              <button
                key={tab}
                className={`rounded-[calc(var(--radius)-4px)] px-3 py-1.5 text-xs font-semibold transition-all ${
                  i === 0
                    ? 'bg-card text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {mounted ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                  tickMargin={4}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: gridColor, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#7C3AED', strokeWidth: 2, stroke: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#profitGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] animate-pulse rounded-xl bg-muted" />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
