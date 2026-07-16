'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ── Data ──────────────────────────────────────────────────────
const insights = [
  {
    id: '1',
    type: 'opportunity' as const,
    title: 'Price Optimization Found',
    description:
      'Wireless Earbuds Pro can sustain a 12% price increase based on competitor positioning. Est. +$8,400/mo.',
    confidence: 94,
    icon: TrendingUp,
    gradient: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    action: 'Review Pricing',
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'Stock-out Risk: 8 SKUs',
    description:
      'Ultra-Slim Laptop Stand and 7 others will stock out within 5 days at current velocity.',
    confidence: 98,
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/10',
    action: 'Order Now',
  },
  {
    id: '3',
    type: 'insight' as const,
    title: 'Listing Quality: 14 Below 70%',
    description:
      'Improving A+ content and bullet points on underperforming listings could boost organic traffic ~35%.',
    confidence: 87,
    icon: Lightbulb,
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/10',
    action: 'Optimize',
  },
];

const badgeLabel: Record<(typeof insights)[number]['type'], string> = {
  opportunity: 'Opportunity',
  warning: 'Action Needed',
  insight: 'Insight',
};

const badgeVariant: Record<(typeof insights)[number]['type'], 'purple' | 'warning' | 'info'> = {
  opportunity: 'purple',
  warning: 'warning',
  insight: 'info',
};

// ── Component ─────────────────────────────────────────────────
export function AIInsightsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-brand">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <CardTitle>AI Insights</CardTitle>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {insights.length} actionable insights detected
          </p>
        </CardHeader>

        <CardContent className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="group rounded-xl border border-border p-3.5 hover:border-primary/30 hover:bg-muted/50 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      insight.bg,
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        insight.id === '1' && 'text-violet-500',
                        insight.id === '2' && 'text-amber-500',
                        insight.id === '3' && 'text-blue-500',
                      )}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {insight.title}
                      </p>
                      <Badge variant={badgeVariant[insight.type]} className="shrink-0 text-[10px]">
                        {badgeLabel[insight.type]}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                      {insight.description}
                    </p>

                    {/* Confidence + Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full bg-gradient-to-r', insight.gradient)}
                            style={{ width: `${insight.confidence}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {insight.confidence}% confidence
                        </span>
                      </div>

                      <button className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>{insight.action}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
