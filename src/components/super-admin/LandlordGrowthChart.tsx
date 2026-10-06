import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleAlert } from 'lucide-react';
import { ADMIN_CARD } from '@/lib/adminStatusColors';
import type { MonthlyTrendPoint } from '@/hooks/useSuperAdminData';

const SERIES_COLOR = '#2a78d6';

const LandlordGrowthChart = ({
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
      <CardTitle className="text-sm font-medium text-[#64748B]">Landlord Growth</CardTitle>
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
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="landlordGrowthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}
              formatter={(value: number) => [value, 'New landlords']}
            />
            <Area
              type="monotone"
              dataKey="landlordSignups"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              fill="url(#landlordGrowthFill)"
              dot={{ r: 3, fill: SERIES_COLOR, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

export default LandlordGrowthChart;
