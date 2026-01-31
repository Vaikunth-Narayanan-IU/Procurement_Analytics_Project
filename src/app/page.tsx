"use client";

import { useMemo } from "react";
import Link from "next/link";
import ColumnMapper from "@/components/ColumnMapper";
import DataDiagnostics from "@/components/DataDiagnostics";
import DataControls from "@/components/DataControls";
import FiltersBar from "@/components/FiltersBar";
import KPICard from "@/components/KPICard";
import BasicTable from "@/components/tables/BasicTable";
import Badge from "@/components/ui/Badge";
import RiskTrendChart from "@/components/charts/RiskTrendChart";
import LateDeliveriesBar from "@/components/charts/LateDeliveriesBar";
import DefectsBar from "@/components/charts/DefectsBar";
import SpendRiskScatter from "@/components/charts/SpendRiskScatter";
import {
  applyFilters,
  computeMonthlyRiskTrend,
  computeSupplierMetrics,
  uniqueOptions,
} from "@/lib/analytics";
import { useDataStore } from "@/lib/store";
import { formatNumber, formatPercent, formatCurrency, toSupplierSlug } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";

export default function HomePage() {
  const rawRows = useDataStore((state) => state.rawRows);
  const data = useDataStore((state) => state.data);
  const filters = useDataStore((state) => state.filters);
  const setFilter = useDataStore((state) => state.setFilter);

  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);
  const suppliers = useMemo(() => uniqueOptions(data, "supplier"), [data]);
  const categories = useMemo(() => uniqueOptions(data, "category"), [data]);
  const regions = useMemo(() => uniqueOptions(data, "region"), [data]);

  const metrics = useMemo(() => computeSupplierMetrics(filtered), [filtered]);
  const kpis = useMemo(() => {
    const total = filtered.length;
    const onTime = metrics.length
      ? metrics.reduce((acc, metric) => acc + metric.on_time_rate * metric.total_pos, 0) /
        metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
      : 0;
    const avgDaysLate = metrics.length
      ? metrics.reduce((acc, metric) => acc + metric.avg_days_late * metric.total_pos, 0) /
        metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
      : 0;
    const defectRate = metrics.length
      ? metrics.reduce((acc, metric) => acc + metric.defect_rate * metric.total_pos, 0) /
        metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
      : 0;
    const complianceRate = metrics.length
      ? metrics.reduce((acc, metric) => acc + metric.compliance_gap_rate * metric.total_pos, 0) /
        metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
      : 0;
    const partialRate = metrics.length
      ? metrics.reduce((acc, metric) => acc + metric.partial_order_rate * metric.total_pos, 0) /
        metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
      : 0;
    return { total, onTime, avgDaysLate, defectRate, complianceRate, partialRate };
  }, [filtered, metrics]);

  const monthlyRisk = useMemo(() => computeMonthlyRiskTrend(filtered), [filtered]);

  const lateBySupplier = useMemo(
    () => metrics.map((metric) => ({ supplier: metric.supplier, late_deliveries: metric.late_deliveries })),
    [metrics]
  );
  const defectsBySupplier = useMemo(
    () => metrics.map((metric) => ({ supplier: metric.supplier, defects: metric.defects })),
    [metrics]
  );
  const spendVsRisk = useMemo(
    () =>
      metrics
        .filter((metric) => metric.spend > 0)
        .map((metric) => ({
          supplier: metric.supplier,
          spend: metric.spend,
          risk_score: metric.risk_score,
        })),
    [metrics]
  );

  const columns = useMemo<ColumnDef<(typeof metrics)[number]>[]>(
    () => [
      {
        header: "Supplier",
        accessorKey: "supplier",
        cell: ({ row }) => (
          <Link
            className="font-semibold text-slate-900 hover:underline"
            href={`/supplier/${toSupplierSlug(row.original.supplier)}`}
          >
            {row.original.supplier}
          </Link>
        ),
      },
      {
        header: "Risk Score",
        accessorKey: "risk_score",
        cell: ({ row }) => row.original.risk_score.toFixed(1),
      },
      {
        header: "Risk Band",
        accessorKey: "risk_band",
        cell: ({ row }) => (
          <Badge
            label={row.original.risk_band}
            tone={
              row.original.risk_band === "High"
                ? "high"
                : row.original.risk_band === "Medium"
                ? "mid"
                : "low"
            }
          />
        ),
      },
      {
        header: "On-time",
        accessorKey: "on_time_rate",
        cell: ({ row }) => formatPercent(row.original.on_time_rate, 1),
      },
      {
        header: "Defect Rate",
        accessorKey: "defect_rate",
        cell: ({ row }) => formatPercent(row.original.defect_rate, 1),
      },
      {
        header: "Compliance Gap",
        accessorKey: "compliance_gap_rate",
        cell: ({ row }) => formatPercent(row.original.compliance_gap_rate, 1),
      },
      {
        header: "Partial Orders",
        accessorKey: "partial_order_rate",
        cell: ({ row }) => formatPercent(row.original.partial_order_rate, 1),
      },
    ],
    []
  );

  const hasPromise = data.some((row) => row.promised_delivery_date);
  const hasActual = data.some((row) => row.actual_delivery_date);
  const hasDeliveryStatus = data.some((row) => row.delivery_status);
  const hasDate = data.some((row) => row.po_date || row.promised_delivery_date || row.actual_delivery_date);
  const hasTotalCost = data.some((row) => row.total_cost !== null && row.total_cost !== undefined);
  const hasDefects = data.some(
    (row) =>
      (row.defect_flag !== null && row.defect_flag !== undefined) ||
      (row.defect_count !== null && row.defect_count !== undefined)
  );
  const hasCompliance = data.some(
    (row) => row.compliance_flag !== null && row.compliance_flag !== undefined
  );

  const activeFilters = useMemo(() => {
    const parts: string[] = [];
    if (filters.supplier && filters.supplier !== "All") {
      parts.push(`Supplier=${filters.supplier}`);
    }
    if (filters.category && filters.category !== "All") {
      parts.push(`Category=${filters.category}`);
    }
    if (filters.region && filters.region !== "All") {
      parts.push(`Region=${filters.region}`);
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom || "";
      const to = filters.dateTo || "";
      parts.push(`Date=${from || "..."} to ${to || "..."}`);
    }
    return parts.length ? parts.join(", ") : "None";
  }, [filters]);

  const diagnosticsNotes = useMemo(() => {
    const notes: string[] = [];
    if (!hasPromise || !hasActual) {
      notes.push("Delivery dates not present in dataset");
    }
    if (!hasDeliveryStatus && (!hasPromise || !hasActual)) {
      notes.push("Delivery status not present in dataset");
    }
    if (!hasDefects) {
      notes.push("Defect data missing");
    }
    if (!hasCompliance) {
      notes.push("Compliance data missing");
    }
    if (!hasTotalCost) {
      notes.push("Pricing data missing");
    }
    return notes;
  }, [hasPromise, hasActual, hasDeliveryStatus, hasDefects, hasCompliance, hasTotalCost]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Supplier Risk Cockpit</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Monitor procurement KPIs, flag supplier risk, and isolate compliance gaps across 700+ POs.
              Load the sample dataset or bring your own CSV and map columns to the canonical schema.
            </p>
          </div>
          <DataControls />
        </div>
        <div className="mt-4 text-xs text-slate-500">
          {rawRows.length
            ? `${rawRows.length.toLocaleString()} rows loaded. ${data.length.toLocaleString()} mapped to canonical fields.`
            : "No data loaded yet."}
        </div>
      </section>

      <DataDiagnostics notes={diagnosticsNotes} />
      <ColumnMapper />

      {data.length > 0 ? (
        <>
          <FiltersBar
            suppliers={suppliers}
            categories={categories}
            regions={regions}
            filters={filters}
            onFilterChange={setFilter}
            showDate={hasDate}
          />
          <p className="text-xs text-slate-500">
            Active filters: <span className="font-semibold text-slate-700">{activeFilters}</span>
          </p>

          <section className="grid gap-4 md:grid-cols-3">
            <KPICard title="Total POs" value={formatNumber(kpis.total, 0)} />
            <KPICard title="On-time Delivery" value={formatPercent(kpis.onTime, 1)} />
            <KPICard title="Avg Days Late" value={formatNumber(kpis.avgDaysLate, 1)} />
            <KPICard title="Defect Rate" value={formatPercent(kpis.defectRate, 1)} />
            <KPICard title="Compliance Gap Rate" value={formatPercent(kpis.complianceRate, 1)} />
            <KPICard title="Partial Order Rate" value={formatPercent(kpis.partialRate, 1)} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <RiskTrendChart data={monthlyRisk} />
            {hasPromise && hasActual || hasDeliveryStatus ? (
              lateBySupplier.length ? (
                <LateDeliveriesBar data={lateBySupplier.slice(0, 10)} />
              ) : (
                <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  No data matches current filters
                </section>
              )
            ) : (
              <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                Delivery dates not present in dataset
              </section>
            )}
            {hasDefects ? (
              defectsBySupplier.length ? (
                <DefectsBar data={defectsBySupplier.slice(0, 10)} />
              ) : (
                <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  No data matches current filters
                </section>
              )
            ) : (
              <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                Defect data missing
              </section>
            )}
            {hasTotalCost ? (
              spendVsRisk.length ? (
                <SpendRiskScatter data={spendVsRisk} />
              ) : (
                <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  No data matches current filters
                </section>
              )
            ) : (
              <section className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                Pricing data missing
              </section>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Supplier Risk Leaderboard</h2>
              <span className="text-xs text-slate-500">
                Avg risk score {metrics.length ? formatNumber(
                  metrics.reduce((acc, metric) => acc + metric.risk_score, 0) / metrics.length,
                  1
                ) : "0"}
              </span>
            </div>
            <BasicTable data={metrics} columns={columns} />
          </section>

          {hasTotalCost ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Spend Signal</h3>
              <p className="mt-2 text-sm text-slate-600">
                High spend combined with elevated risk indicates where supplier management actions deliver
                the biggest impact.
              </p>
              <div className="mt-3 text-2xl font-semibold text-slate-900">
                {formatCurrency(
                  spendVsRisk.reduce((acc, item) => acc + item.spend, 0)
                )} total spend in view
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-600">
          Upload a CSV or load the sample dataset to start exploring supplier risk insights.
        </section>
      )}
    </div>
  );
}
