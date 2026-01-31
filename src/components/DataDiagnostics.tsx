"use client";

import { useMemo, useState } from "react";
import { useDataStore } from "@/lib/store";

const MetricRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold text-slate-900">{value}</span>
  </div>
);

export default function DataDiagnostics({ notes }: { notes: string[] }) {
  const [open, setOpen] = useState(false);
  const data = useDataStore((state) => state.data);
  const rawRows = useDataStore((state) => state.rawRows);
  const datasetSource = useDataStore((state) => state.datasetSource);
  const datasetName = useDataStore((state) => state.datasetName);
  const mapping = useDataStore((state) => state.mapping);

  const supplierCount = useMemo(() => {
    const set = new Set<string>();
    data.forEach((row) => {
      if (row.supplier) set.add(row.supplier);
    });
    return set.size;
  }, [data]);

  const diagnostics = useMemo(() => {
    const count = (predicate: (row: typeof data[number]) => boolean) =>
      data.reduce((acc, row) => (predicate(row) ? acc + 1 : acc), 0);

    return {
      deliveryDates: count((row) => !!row.promised_delivery_date || !!row.actual_delivery_date),
      defects: count(
        (row) =>
          (row.defect_flag !== null && row.defect_flag !== undefined) ||
          (row.defect_count !== null && row.defect_count !== undefined)
      ),
      compliance: count((row) => row.compliance_flag !== null && row.compliance_flag !== undefined),
      quantities: count(
        (row) =>
          row.qty_ordered !== null ||
          row.qty_received !== null ||
          row.partial_order_flag !== null
      ),
      pricing: count((row) => row.total_cost !== null || row.unit_price !== null),
    };
  }, [data]);

  const mappingRows = useMemo(() => {
    return Object.entries(mapping)
      .filter(([, value]) => value)
      .map(([key, value]) => ({ key, value }));
  }, [mapping]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Data Diagnostics</h2>
          <p className="text-xs text-slate-500">
            Inspect what data is available and why some visuals might be hidden.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
        >
          {open ? "Hide" : "Show"} diagnostics
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <MetricRow
              label="Dataset source"
              value={datasetSource === "sample" ? "Sample (Kaggle)" : datasetSource === "upload" ? "Uploaded CSV" : "Unknown"}
            />
            <MetricRow label="Dataset name" value={datasetName ?? "-"} />
            <MetricRow label="Rows loaded" value={rawRows.length.toLocaleString()} />
            <MetricRow label="Suppliers" value={supplierCount.toLocaleString()} />
            <MetricRow
              label="Mapped rows"
              value={`${data.length.toLocaleString()} / ${rawRows.length.toLocaleString()}`}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MetricRow label="Delivery dates" value={diagnostics.deliveryDates.toLocaleString()} />
            <MetricRow label="Defect data" value={diagnostics.defects.toLocaleString()} />
            <MetricRow label="Compliance data" value={diagnostics.compliance.toLocaleString()} />
            <MetricRow label="Quantities" value={diagnostics.quantities.toLocaleString()} />
            <MetricRow label="Pricing" value={diagnostics.pricing.toLocaleString()} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Column mapping
            </h3>
            <div className="mt-3 grid gap-2 text-sm">
              {mappingRows.length ? (
                mappingRows.map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between">
                    <span className="text-slate-500">{entry.key}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No mapping available.</p>
              )}
            </div>
          </div>

          {notes.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              <p className="font-semibold">Hidden charts</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}