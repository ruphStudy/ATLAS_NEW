'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/ui/states';

export interface TrendChartPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendChartPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
}

export function TrendChart({ data, valueFormatter, height = 260 }: TrendChartProps) {
  if (!data || data.length === 0) {
    return <EmptyState title="No trend data yet" className="border-none py-8" />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} axisLine={{ stroke: 'rgb(var(--border))' }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v: number) => (valueFormatter ? valueFormatter(v) : String(v))}
        />
        <Tooltip
          contentStyle={{ background: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'rgb(var(--foreground))' }}
          formatter={(value: number) => (valueFormatter ? valueFormatter(value) : value)}
        />
        <Line type="monotone" dataKey="value" stroke="rgb(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
