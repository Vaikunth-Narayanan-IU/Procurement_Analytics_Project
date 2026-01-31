"use client";

import { useEffect } from "react";
import { useDataStore } from "@/lib/store";
import { buildHeaderHash } from "@/lib/utils";

export default function ClientInit() {
  const setRawData = useDataStore((state) => state.setRawData);
  const applyMapping = useDataStore((state) => state.applyMapping);
  const applyAutoMapping = useDataStore((state) => state.applyAutoMapping);
  const setDatasetContext = useDataStore((state) => state.setDatasetContext);
  const loadMapping = useDataStore((state) => state.loadMappingFromStorage);
  const setShowMapper = useDataStore((state) => state.setShowMapper);

  useEffect(() => {
    const loadSample = async () => {
      try {
        const response = await fetch("/sample/procurement.csv");
        if (!response.ok) return;
        const text = await response.text();
        const result = await import("papaparse").then((mod) => mod.default.parse(text, {
          header: true,
          skipEmptyLines: true,
        }));
        const rows = (result.data as Record<string, string>[]) ?? [];
        const headers = (result.meta.fields ?? []).map((header) => header.trim());
        setDatasetContext({
          source: "sample",
          name: "procurement.csv",
          mappingKey: `procurement.csv::${buildHeaderHash(headers)}`,
        });
        setRawData(rows, headers);
        applyAutoMapping(headers, { preferKaggle: true });
        setShowMapper(false);
        applyMapping();
      } catch {
        // ignore
      }
    };

    loadSample();
    loadMapping();
  }, [applyAutoMapping, applyMapping, loadMapping, setDatasetContext, setRawData, setShowMapper]);

  return null;
}
