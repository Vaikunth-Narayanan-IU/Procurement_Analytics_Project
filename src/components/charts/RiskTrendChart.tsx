"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function RiskTrendChart({ data }: { data: { month: string; risk_score: number }[] }) {
  return (
    <div className="h-72 w-full rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Risk Trend by Month
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return Number.isFinite(num) ? `${num}` : "N/A";
            }}
          />
          <Line type="monotone" dataKey="risk_score" stroke="#0f172a" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
