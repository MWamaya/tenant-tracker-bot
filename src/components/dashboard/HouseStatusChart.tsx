import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface HouseStatusChartProps {
  paid: number;
  partial: number;
  unpaid: number;
}

export const HouseStatusChart = ({ paid, partial, unpaid }: HouseStatusChartProps) => {
  const data = [
    { name: 'Fully Paid', value: paid, color: 'hsl(142, 76%, 36%)' },
    { name: 'Partial', value: partial, color: 'hsl(38, 92%, 50%)' },
    { name: 'Unpaid', value: unpaid, color: 'hsl(0, 84%, 60%)' },
  ].filter(item => item.value > 0);

  return (
    <div className="stat-card animate-slide-up">
      <h3 className="text-lg font-semibold mb-4">Payment Status Overview</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-2xl font-bold text-success">{paid}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-warning">{partial}</p>
          <p className="text-xs text-muted-foreground">Partial</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-destructive">{unpaid}</p>
          <p className="text-xs text-muted-foreground">Unpaid</p>
        </div>
      </div>
    </div>
  );
};
