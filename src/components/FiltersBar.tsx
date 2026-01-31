"use client";

import type { Filters } from "@/lib/store";

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
    {label}
    <select
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="All">All</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

export default function FiltersBar({
  suppliers,
  categories,
  regions,
  filters,
  onFilterChange,
  showDate,
}: {
  suppliers: string[];
  categories: string[];
  regions: string[];
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  showDate: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
      <FilterSelect
        label="Supplier"
        value={filters.supplier}
        options={suppliers}
        onChange={(value) => onFilterChange("supplier", value)}
      />
      <FilterSelect
        label="Category"
        value={filters.category}
        options={categories}
        onChange={(value) => onFilterChange("category", value)}
      />
      <FilterSelect
        label="Region"
        value={filters.region}
        options={regions}
        onChange={(value) => onFilterChange("region", value)}
      />
      {showDate ? (
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Date from
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onFilterChange("dateFrom", event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </label>
      ) : null}
      {showDate ? (
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Date to
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => onFilterChange("dateTo", event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </label>
      ) : null}
    </div>
  );
}
