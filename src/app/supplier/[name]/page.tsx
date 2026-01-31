"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MetricBar from "@/components/ui/MetricBar";
import Badge from "@/components/ui/Badge";
import BasicTable from "@/components/tables/BasicTable";
import {
  buildTopIssues,
  computeSupplierMetrics,
  computeSupplierMonthlyRates,
} from "@/lib/analytics";
import { useDataStore } from "@/lib/store";
import { formatNumber, formatPercent, fromSupplierSlug } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RiskTrend = ({
  title,
  dataKey,
  data,
}: {
  title: string;
  dataKey: "late_rate" | "defect_rate" | "compliance_gap_rate";
  data: { month: string; late_rate: number; defect_rate: number; compliance_gap_rate: number }[];
}) => (
  <div className="h-64 w-full rounded-2xl border border-slate-200 bg-white p-4">
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} />
        <Tooltip formatter={(value: number) => formatPercent(value, 1)} />
        <Line type="monotone" dataKey={dataKey} stroke="#0f172a" strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default function SupplierDetailPage() {
  const params = useParams();
  const data = useDataStore((state) => state.data);
  const supplierSlug = Array.isArray(params?.name) ? params?.name[0] : params?.name;
  const supplierName = supplierSlug ? fromSupplierSlug(supplierSlug) : "";

  const metrics = useMemo(() => computeSupplierMetrics(data), [data]);
  const metric = metrics.find((entry) => entry.supplier === supplierName);
  const monthly = useMemo(
    () => computeSupplierMonthlyRates(data, supplierName),
    [data, supplierName]
  );
  const issues = useMemo(
    () => buildTopIssues(data).filter((issue) => issue.supplier === supplierName),
    [data, supplierName]
  );

  const maxAvgDaysLate = Math.max(0, ...metrics.map((entry) => entry.avg_days_late));
  const normalizedAvgDaysLate = metric && maxAvgDaysLate ? metric.avg_days_late / maxAvgDaysLate : 0;

  const issueColumns = useMemo<ColumnDef<(typeof issues)[number]>[]>(
    () => [
      { header: "PO ID", accessorKey: "po_id" },
      { header: "Issue", accessorKey: "issue_type" },
      { header: "Days Late", accessorKey: "days_late" },
      { header: "Details", accessorKey: "details" },
    ],
    []
  );

  if (!metric) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Supplier not found</h1>
        <p className="mt-2 text-sm text-slate-600">Select a supplier from the dashboard leaderboard.</p>
        <Link
          href="/"
          className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const riskDrivers = [
    { label: "Late Rate", value: metric.late_rate, key: "late" },
    { label: "Avg Days Late", value: normalizedAvgDaysLate, key: "avg_late" },
    { label: "Missing Dates", value: metric.missing_delivery_rate, key: "missing" },
    { label: "Defect Rate", value: metric.defect_rate, key: "defect" },
    { label: "Compliance Gaps", value: metric.compliance_gap_rate, key: "compliance" },
    { label: "Partial Orders", value: metric.partial_order_rate, key: "partial" },
    { label: "Price Outliers", value: metric.price_outlier_rate, key: "price" },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  const recommendations = riskDrivers.map((driver) => {
    switch (driver.key) {
      case "late":
      case "avg_late":
        return "Tighten delivery SLAs and add expedited lanes for critical POs.";
      case "missing":
        return "Enforce mandatory delivery dates and fix upstream data capture.";
      case "defect":
        return "Launch a joint quality audit and increase incoming inspection sampling.";
      case "compliance":
        return "Schedule compliance reviews and require corrective action plans.";
      case "partial":
        return "Align order quantities with supplier capacity and track fill rates weekly.";
      case "price":
        return "Benchmark pricing by category-month and renegotiate rate cards.";
      default:
        return "Review supplier scorecard and align on improvement actions.";
    }
  });

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</p>
            <h1 className="text-3xl font-semibold text-slate-900">{supplierName}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {metric.total_pos} POs · Avg days late {formatNumber(metric.avg_days_late, 1)} · On-time {" "}
              {formatPercent(metric.on_time_rate, 1)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Score</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">{metric.risk_score}</p>
            <div className="mt-2 flex justify-end">
              <Badge
                label={metric.risk_band}
                tone={metric.risk_band === "High" ? "high" : metric.risk_band === "Medium" ? "mid" : "low"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <MetricBar label="Late Rate" value={metric.late_rate} color="#f97316" />
        <MetricBar label="Avg Days Late (normalized)" value={normalizedAvgDaysLate} color="#fb923c" />
        <MetricBar label="Missing Delivery Dates" value={metric.missing_delivery_rate} color="#94a3b8" />
        <MetricBar label="Defect Rate" value={metric.defect_rate} color="#ef4444" />
        <MetricBar label="Compliance Gaps" value={metric.compliance_gap_rate} color="#e11d48" />
        <MetricBar label="Partial Orders" value={metric.partial_order_rate} color="#38bdf8" />
        <MetricBar label="Price Outliers" value={metric.price_outlier_rate} color="#0ea5e9" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <RiskTrend title="Late Rate Trend" dataKey="late_rate" data={monthly} />
        <RiskTrend title="Defect Rate Trend" dataKey="defect_rate" data={monthly} />
        <RiskTrend title="Compliance Gap Trend" dataKey="compliance_gap_rate" data={monthly} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Top Issues</h2>
        <BasicTable data={issues.slice(0, 12)} columns={issueColumns} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Recommended Actions</h2>
        <p className="mt-2 text-sm text-slate-600">Based on top risk drivers for this supplier.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recommendations.map((rec, index) => (
            <div key={`${rec}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Action {index + 1}</p>
              <p className="mt-1 text-sm text-slate-600">{rec}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
