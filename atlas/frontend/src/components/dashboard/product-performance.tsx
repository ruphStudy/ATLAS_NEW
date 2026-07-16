'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Data ──────────────────────────────────────────────────────
const products = [
  {
    name: 'Wireless Earbuds Pro',
    asin: 'B0CX9J5MN1',
    revenue: '$42,800',
    units: 1240,
    margin: 34,
    trend: 'up' as const,
    change: '+12%',
    status: 'active' as const,
    score: 94,
  },
  {
    name: 'Ultra-Slim Laptop Stand',
    asin: 'B09KPJMN3Q',
    revenue: '$28,500',
    units: 890,
    margin: 41,
    trend: 'up' as const,
    change: '+8%',
    status: 'active' as const,
    score: 82,
  },
  {
    name: 'USB-C Hub 7-in-1',
    asin: 'B0B5X4P7G9',
    revenue: '$19,200',
    units: 620,
    margin: 28,
    trend: 'down' as const,
    change: '-3%',
    status: 'active' as const,
    score: 71,
  },
  {
    name: 'Mechanical Keyboard TKL',
    asin: 'B0CS8VMHL5',
    revenue: '$14,900',
    units: 285,
    margin: 37,
    trend: 'up' as const,
    change: '+22%',
    status: 'active' as const,
    score: 88,
  },
  {
    name: 'RGB Gaming Mouse',
    asin: 'B0D1M9X7H3',
    revenue: '$11,400',
    units: 410,
    margin: 23,
    trend: 'down' as const,
    change: '-7%',
    status: 'warning' as const,
    score: 58,
  },
];

// ── Score Bar ─────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-6">{score}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────
export function ProductPerformance() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Performance</CardTitle>
              <CardDescription>Revenue by SKU – last 7 days</CardDescription>
            </div>
            <button className="text-xs text-primary hover:underline">View catalog</button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Product', 'Revenue', 'Units', 'Margin', 'Score', 'Trend', 'Status'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <motion.tr
                    key={p.asin}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                    className="group border-b border-border/60 hover:bg-muted/40 transition-colors cursor-default"
                  >
                    {/* Product */}
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-foreground text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.asin}</p>
                    </td>

                    {/* Revenue */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-foreground">{p.revenue}</span>
                    </td>

                    {/* Units */}
                    <td className="px-5 py-3.5">
                      <span className="text-foreground">{p.units.toLocaleString()}</span>
                    </td>

                    {/* Margin */}
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'font-semibold',
                          p.margin >= 35
                            ? 'text-success'
                            : p.margin >= 25
                              ? 'text-warning'
                              : 'text-danger',
                        )}
                      >
                        {p.margin}%
                      </span>
                    </td>

                    {/* Score bar */}
                    <td className="px-5 py-3.5">
                      <ScoreBar score={p.score} />
                    </td>

                    {/* Trend */}
                    <td className="px-5 py-3.5">
                      <div
                        className={cn(
                          'flex items-center gap-1 text-xs font-semibold',
                          p.trend === 'up' ? 'text-success' : 'text-danger',
                        )}
                      >
                        {p.trend === 'up' ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {p.change}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge variant={p.status === 'active' ? 'success' : 'warning'}>
                        {p.status === 'active' ? 'Active' : 'Review'}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
