"use client";

import { useMemo, useState } from "react";
import BasicTable from "@/components/tables/BasicTable";
import { computeExceptions, formatDate } from "@/lib/analytics";
import { useDataStore } from "@/lib/store";
import { type ColumnDef } from "@tanstack/react-table";

const tabs = [
  { key: "missingDates", label: "Missing delivery dates" },
  { key: "compliance", label: "Compliance violations" },
  { key: "defects", label: "Defects" },
  { key: "partials", label: "Partial orders" },
  { key: "priceOutliers", label: "Price outliers" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type ExceptionRow = {
  po_id: string;
  supplier: string;
  category?: string | null;
  region?: string | null;
  po_date?: Date | null;
  issue: string;
};

export default function ExceptionsPage() {
  const data = useDataStore((state) => state.data);
  const [activeTab, setActiveTab] = useState<TabKey>("missingDates");
  const [search, setSearch] = useState("");

  const exceptions = useMemo(() => computeExceptions(data), [data]);

  const rows = useMemo(() => {
    const source = exceptions[activeTab] ?? [];
    return source.map((row) => ({
      po_id: row.po_id,
      supplier: row.supplier,
      category: row.category,
      region: row.region,
      po_date: row.po_date,
      issue: activeTab,
    }));
  }, [exceptions, activeTab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const lowered = search.toLowerCase();
    return rows.filter((row) =>
      `${row.po_id} ${row.supplier} ${row.category ?? ""} ${row.region ?? ""}`
        .toLowerCase()
        .includes(lowered)
    );
  }, [rows, search]);

  const columns = useMemo<ColumnDef<ExceptionRow>[]>(
    () => [
      { header: "PO ID", accessorKey: "po_id" },
      { header: "Supplier", accessorKey: "supplier" },
      { header: "Category", accessorKey: "category" },
      { header: "Region", accessorKey: "region" },
      {
        header: "PO Date",
        accessorKey: "po_date",
        cell: ({ row }) => formatDate(row.original.po_date),
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-3xl font-semibold text-slate-900">Exceptions Center</h1>
        <p className="mt-2 text-sm text-slate-600">
          Drill into missing dates, compliance gaps, defect flags, partial orders, and price anomalies.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>Count: {rows.length}</span>
          </div>
        </div>
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search supplier, PO, category, region"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>
      </section>

      <BasicTable data={filtered} columns={columns} />
    </div>
  );
}
