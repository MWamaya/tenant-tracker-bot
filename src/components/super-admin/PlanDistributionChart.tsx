import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert } from 'lucide-react';
import { ADMIN_CARD } from '@/lib/adminStatusColors';
import type { LandlordProfile } from '@/hooks/useSuperAdminData';

// Fixed hue order (never cycled/reassigned by sort) — first 4 slots of the
// validated categorical palette: blue, orange, aqua, yellow.
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const OTHER_COLOR = '#64748B';

const PlanDistributionChart = ({
  landlords,
  loading,
  error,
}: {
  landlords?: LandlordProfile[];
  loading?: boolean;
  error?: boolean;
}) => {
  const counts = new Map<string, number>();
  for (const l of landlords ?? []) {
    const plan = l.subscription?.plan_name || 'No plan';
    counts.set(plan, (counts.get(plan) || 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 4);
  const rest = sorted.slice(4).reduce((sum, [, count]) => sum + count, 0);
  const data = [
    ...top.map(([name, value], i) => ({ name, value, color: SERIES_COLORS[i] })),
    ...(rest > 0 ? [{ name: 'Other', value: rest, color: OTHER_COLOR }] : []),
  ];

  return (
    <Card className={ADMIN_CARD}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-[#64748B]">Plan Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {loading ? (
          <Skeleton className="h-full w-full bg-[#E2E8F0]" />
        ) : error ? (
          <div className="flex items-center justify-center h-full gap-1.5 text-destructive">
            <CircleAlert className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Failed to load</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[#64748B]">No landlords yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-[#0F172A]">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanDistributionChart;
