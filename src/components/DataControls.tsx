"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { useDataStore } from "@/lib/store";
import { autoMapHeaders, CANONICAL_FIELDS, detectKaggleDataset } from "@/lib/analytics";
import { buildHeaderHash } from "@/lib/utils";

const requiredKeys = CANONICAL_FIELDS.filter((field) => field.required).map((field) => field.key);

const CONFIDENCE_THRESHOLD = 0.45;

const hasRequiredMapping = (mapping: Record<string, string | null>, headers: string[]) => {
  return requiredKeys.every((key) => {
    const mapped = mapping[key];
    return mapped && headers.includes(mapped);
  });
};

export default function DataControls() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const setRawData = useDataStore((state) => state.setRawData);
  const reset = useDataStore((state) => state.reset);
  const applyMapping = useDataStore((state) => state.applyMapping);
  const applyAutoMapping = useDataStore((state) => state.applyAutoMapping);
  const setDatasetContext = useDataStore((state) => state.setDatasetContext);
  const loadMappingFromStorage = useDataStore((state) => state.loadMappingFromStorage);
  const setShowMapper = useDataStore((state) => state.setShowMapper);
  const [loading, setLoading] = useState(false);

  const parseAndStore = (csv: string, context: { source: "sample" | "upload"; name: string }) => {
    const result = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });

    const rows = (result.data ?? []) as Record<string, string>[];
    const headers = (result.meta.fields ?? []).map((header) => header.trim());
    const mappingKey = `${context.name}::${buildHeaderHash(headers)}`;
    const isKaggle = detectKaggleDataset(headers, rows.length, context.source === "sample" ? "/sample/procurement.csv" : undefined);
    setDatasetContext({ source: context.source, name: context.name, mappingKey });
    setRawData(rows, headers);

    const autoMapping = autoMapHeaders(headers, { preferKaggle: isKaggle });
    applyAutoMapping(headers, { preferKaggle: isKaggle });
    const mappingLoaded = context.source === "upload" ? loadMappingFromStorage() : false;

    const mappingSnapshot = mappingLoaded ? useDataStore.getState().mapping : autoMapping;
    const mappedCount = Object.values(mappingSnapshot).filter(Boolean).length;
    const confidence = headers.length ? mappedCount / CANONICAL_FIELDS.length : 0;
    const showMapper =
      context.source === "upload" && (!mappingLoaded || confidence < CONFIDENCE_THRESHOLD);
    setShowMapper(showMapper);

    if (!showMapper && hasRequiredMapping(mappingSnapshot as Record<string, string | null>, headers)) {
      applyMapping();
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const response = await fetch("/sample/procurement.csv");
      const text = await response.text();
      reset();
      parseAndStore(text, { source: "sample", name: "procurement.csv" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      parseAndStore(text, { source: "upload", name: file.name });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
      >
        Upload CSV
      </button>
      <button
        type="button"
        onClick={handleLoadSample}
        className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-100"
      >
        {loading ? "Loading..." : "Reset to sample data"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleUpload(file);
          }
        }}
      />
    </div>
  );
}
