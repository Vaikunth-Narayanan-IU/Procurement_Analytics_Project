"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function SpendRiskScatter({
  data,
}: {
  data: { supplier: string; spend: number; risk_score: number }[];
}) {
  return (
    <div className="h-72 w-full rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Spend vs Risk
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            type="number"
            dataKey="spend"
            tick={{ fontSize: 12 }}
            name="Spend"
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <YAxis type="number" dataKey="risk_score" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name) =>
              name === "spend" ? `$${value.toLocaleString()}` : value
            }
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.supplier ? `${payload[0].payload.supplier}` : label
            }
          />
          <Scatter data={data} fill="#0ea5e9" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
