import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface Datum {
  label: string;
  count: number;
}

interface Props {
  data: Datum[];
  height?: number;
}

// PRD §7.14.2–4 — render a horizontal bar chart with one bar per status.
// Recharts' Funnel component renders a trapezoid-style funnel which is
// visually noisy for our 5-stage funnels; a horizontal bar reads cleanly
// and aligns with the "stacked bar with top 6 + Other" requirement on the
// startup pipeline.
export function FunnelBarChart({ data, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
        <XAxis type="number" stroke="#666666" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          stroke="#666666"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) =>
            typeof value === 'number' ? value.toLocaleString('en-IN') : String(value ?? '')
          }
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="count" fill="#1F73B7" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
