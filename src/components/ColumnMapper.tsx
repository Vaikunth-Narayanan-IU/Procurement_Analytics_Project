"use client";

import { useEffect, useMemo, useState } from "react";
import { autoMapHeaders, CANONICAL_FIELDS, type ColumnMapping } from "@/lib/analytics";
import { useDataStore } from "@/lib/store";

const FieldRow = ({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}) => (
  <div className="grid grid-cols-12 items-center gap-3 rounded-lg border border-black/10 bg-white/70 p-3 text-sm shadow-[0_1px_0_rgba(0,0,0,0.08)]">
    <div className="col-span-5">
      <p className="font-semibold text-slate-900">
        {label}
        {required ? <span className="ml-1 text-xs text-rose-500">Required</span> : null}
      </p>
      <p className="text-xs text-slate-500">Map the CSV column to this field.</p>
    </div>
    <div className="col-span-7">
      <select
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Not mapped</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);

export default function ColumnMapper() {
  const headers = useDataStore((state) => state.headers);
  const storedMapping = useDataStore((state) => state.mapping);
  const rawRows = useDataStore((state) => state.rawRows);
  const showMapper = useDataStore((state) => state.showMapper);
  const setMapping = useDataStore((state) => state.setMapping);
  const applyMapping = useDataStore((state) => state.applyMapping);
  const saveMapping = useDataStore((state) => state.saveMappingToStorage);
  const setShowMapper = useDataStore((state) => state.setShowMapper);

  const [draft, setDraft] = useState<ColumnMapping>(storedMapping);

  useEffect(() => {
    setDraft(storedMapping);
  }, [storedMapping]);

  const requiredMissing = useMemo(() => {
    return CANONICAL_FIELDS.filter((field) => field.required)
      .map((field) => field.key)
      .some((key) => !draft[key]);
  }, [draft]);

  const handleAutoMap = () => {
    const mapped = autoMapHeaders(headers);
    setDraft((prev) => ({ ...prev, ...mapped }));
  };

  const handleApply = () => {
    setMapping(draft);
    saveMapping(draft);
    applyMapping();
    setShowMapper(false);
  };

  const handleContinuePartial = () => {
    setMapping(draft);
    saveMapping(draft);
    applyMapping();
    setShowMapper(false);
  };

  if (!headers.length || !showMapper) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Column Mapper</h2>
          <p className="text-sm text-slate-600">
            Match your CSV headers to the canonical procurement fields. Save once and reuse later.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAutoMap}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
          >
            Auto-map
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={requiredMissing}
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Apply Mapping
          </button>
        </div>
      </div>
      {requiredMissing ? (
        <p className="mt-3 text-xs text-rose-600">
          Map the required fields (PO ID and Supplier) before applying.
        </p>
      ) : null}
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        Auto-mapping confidence was low, so we need your help to complete the mapping. You can
        proceed with partial data if needed.
      </div>
      <div className="mt-6 grid gap-3">
        {CANONICAL_FIELDS.map((field) => (
          <FieldRow
            key={field.key}
            label={field.label}
            required={field.required}
            value={draft[field.key]}
            options={headers}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                [field.key]: value,
              }))
            }
          />
        ))}
      </div>
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Preview (first 10 rows)
        </h3>
        <div className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2 text-left font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawRows.slice(0, 10).map((row, index) => (
                <tr key={`preview-${index}`} className="border-t border-slate-100">
                  {headers.map((header) => (
                    <td key={`${header}-${index}`} className="px-3 py-2 text-slate-700">
                      {row[header] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleContinuePartial}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
        >
          Continue with partial data
        </button>
      </div>
    </section>
  );
}
