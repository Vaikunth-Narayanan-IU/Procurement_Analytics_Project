import { create } from "zustand";
import type { CanonicalPO, ColumnMapping } from "./analytics";
import { autoMapHeaders, defaultMapping, mapRows } from "./analytics";

export type Filters = {
  supplier: string;
  category: string;
  region: string;
  dateFrom: string;
  dateTo: string;
};

export type DataState = {
  rawRows: Record<string, string>[];
  headers: string[];
  mapping: ColumnMapping;
  data: CanonicalPO[];
  filters: Filters;
  datasetSource: "sample" | "upload" | null;
  datasetName: string | null;
  mappingKey: string | null;
  showMapper: boolean;
  setRawData: (rows: Record<string, string>[], headers: string[]) => void;
  setMapping: (mapping: ColumnMapping) => void;
  applyMapping: () => void;
  setFilter: (key: keyof Filters, value: string) => void;
  reset: () => void;
  loadMappingFromStorage: () => boolean;
  saveMappingToStorage: (mapping: ColumnMapping) => void;
  setDatasetContext: (context: {
    source: "sample" | "upload";
    name: string;
    mappingKey: string;
  }) => void;
  applyAutoMapping: (headers: string[], opts?: { preferKaggle?: boolean }) => void;
  setShowMapper: (value: boolean) => void;
};

const STORAGE_KEY = "supplier-risk-cockpit-mapping";

const defaultFilters: Filters = {
  supplier: "All",
  category: "All",
  region: "All",
  dateFrom: "",
  dateTo: "",
};

export const useDataStore = create<DataState>((set, get) => ({
  rawRows: [],
  headers: [],
  mapping: { ...defaultMapping },
  data: [],
  filters: { ...defaultFilters },
  datasetSource: null,
  datasetName: null,
  mappingKey: null,
  showMapper: false,
  setRawData: (rows, headers) => set({ rawRows: rows, headers }),
  setMapping: (mapping) => set({ mapping }),
  applyMapping: () => {
    const { rawRows, mapping } = get();
    const data = mapRows(rawRows, mapping);
    set({ data });
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  reset: () =>
    set({
      rawRows: [],
      headers: [],
      mapping: { ...defaultMapping },
      showMapper: false,
      data: [],
      filters: { ...defaultFilters },
      datasetSource: null,
      datasetName: null,
      mappingKey: null,
    }),
  loadMappingFromStorage: () => {
    if (typeof window === "undefined") return false;
    const { mappingKey } = get();
    if (!mappingKey) return false;
    const stored = window.localStorage.getItem(`${STORAGE_KEY}:${mappingKey}`);
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored) as ColumnMapping;
      set({ mapping: { ...defaultMapping, ...parsed } });
      return true;
    } catch {
      // ignore
    }
    return false;
  },
  saveMappingToStorage: (mapping) => {
    if (typeof window === "undefined") return;
    const { mappingKey } = get();
    if (!mappingKey) return;
    window.localStorage.setItem(`${STORAGE_KEY}:${mappingKey}`, JSON.stringify(mapping));
  },
  setDatasetContext: ({ source, name, mappingKey }) =>
    set({ datasetSource: source, datasetName: name, mappingKey }),
  applyAutoMapping: (headers, opts) => {
    const mapping = autoMapHeaders(headers, opts);
    set({ mapping });
  },
  setShowMapper: (value) => set({ showMapper: value }),
}));
