import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export interface TelemetryBucket {
  date: string;
  attributed: number;
  anonymous: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
      {payload.length > 1 && (
        <p className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
          Total: {total.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export const TelemetryAreaChart = ({ data }: { data: TelemetryBucket[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAttributed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#52427F" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#52427F" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorAnonymous" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Area
          type="monotone"
          dataKey="attributed"
          name="Attributed"
          stroke="#52427F"
          strokeWidth={2}
          fill="url(#colorAttributed)"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="anonymous"
          name="Anonymous"
          stroke="#94a3b8"
          strokeWidth={2}
          fill="url(#colorAnonymous)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
