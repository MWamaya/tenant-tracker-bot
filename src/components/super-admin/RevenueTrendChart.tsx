import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert } from 'lucide-react';
import { ADMIN_CARD } from '@/lib/adminStatusColors';
import type { MonthlyTrendPoint } from '@/hooks/useSuperAdminData';

const SERIES_COLOR = '#008300';

const RevenueTrendChart = ({
  data,
  loading,
  error,
}: {
  data?: MonthlyTrendPoint[];
  loading?: boolean;
  error?: boolean;
}) => (
  <Card className={ADMIN_CARD}>
    <CardHeader>
      <CardTitle className="text-sm font-medium text-[#64748B]">Rent Collected (Platform-wide)</CardTitle>
    </CardHeader>
    <CardContent className="h-64">
      {loading ? (
        <Skeleton className="h-full w-full bg-[#E2E8F0]" />
      ) : error || !data ? (
        <div className="flex items-center justify-center h-full gap-1.5 text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Failed to load</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}
              formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Collected']}
            />
            <Bar dataKey="rentCollected" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

export default RevenueTrendChart;
