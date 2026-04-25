import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Datum {
  week_of: string;
  accepted: number;
  rejected: number;
  skipped: number;
}

interface Props {
  data: Datum[];
  height?: number;
}

// PRD §7.14.6 — weekly match-success percentages over time. The data is
// already in the [0..1] range; we multiply by 100 for chart axes.
export function MatchSuccessChart({ data, height = 280 }: Props) {
  const series = data.map((d) => ({
    week_of: d.week_of,
    accepted: Math.round((d.accepted ?? 0) * 100),
    rejected: Math.round((d.rejected ?? 0) * 100),
    skipped: Math.round((d.skipped ?? 0) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E8" />
        <XAxis dataKey="week_of" stroke="#666666" tick={{ fontSize: 12 }} />
        <YAxis stroke="#666666" tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          formatter={(value) => (typeof value === 'number' ? `${value}%` : String(value ?? ''))}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="accepted" stroke="#16A34A" strokeWidth={2} />
        <Line type="monotone" dataKey="rejected" stroke="#DC2626" strokeWidth={2} />
        <Line type="monotone" dataKey="skipped" stroke="#666666" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
