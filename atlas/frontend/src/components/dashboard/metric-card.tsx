'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  gradient: string;
  description?: string;
  index?: number;
}

export function MetricCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  gradient,
  description,
  index = 0,
}: MetricCardProps) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-[var(--radius)] border border-border bg-card p-5 shadow-card cursor-default"
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          'bg-gradient-to-br',
          gradient.replace('from-', 'from-').replace('to-', 'to-'),
        )}
        style={{ opacity: 0 }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon + Label row */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm',
              `bg-gradient-to-br ${gradient}`,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Trend badge */}
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
              isPositive && 'bg-success/10 text-success',
              isNegative && 'bg-danger/10 text-danger',
              !isPositive && !isNegative && 'bg-muted text-muted-foreground',
            )}
          >
            {isPositive && <TrendingUp className="h-3 w-3" />}
            {isNegative && <TrendingDown className="h-3 w-3" />}
            <span>{change}</span>
          </div>
        </div>

        {/* Value */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>

      {/* Bottom gradient line */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          `bg-gradient-to-r ${gradient}`,
        )}
      />
    </motion.div>
  );
}
