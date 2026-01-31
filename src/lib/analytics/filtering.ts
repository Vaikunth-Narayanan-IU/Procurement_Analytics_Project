import type { CanonicalPO } from "./types";
import type { Filters } from "@/lib/store";

export const applyFilters = (data: CanonicalPO[], filters: Filters) => {
  const parseDateSafe = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isValidDate = (value: Date | null): value is Date =>
    value !== null && !Number.isNaN(value.getTime());

  const from = parseDateSafe(filters.dateFrom);
  const to = parseDateSafe(filters.dateTo);

  return data.filter((row) => {
    if (filters.supplier && filters.supplier !== "All" && row.supplier !== filters.supplier) {
      return false;
    }
    if (filters.category && filters.category !== "All" && row.category !== filters.category) {
      return false;
    }
    if (filters.region && filters.region !== "All" && row.region !== filters.region) {
      return false;
    }
    const rowDate = row.po_date ?? null;
    if (isValidDate(from)) {
      if (!rowDate) return false;
      if (rowDate < from) return false;
    }
    if (isValidDate(to)) {
      if (!rowDate) return false;
      if (rowDate > to) return false;
    }
    return true;
  });
};

export const uniqueOptions = (data: CanonicalPO[], key: keyof CanonicalPO) => {
  const set = new Set<string>();
  data.forEach((row) => {
    const value = row[key];
    if (typeof value === "string" && value.trim().length) {
      set.add(value);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};
