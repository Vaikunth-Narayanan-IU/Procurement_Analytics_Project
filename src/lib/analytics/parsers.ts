export const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const trimValue = (value?: string | null) => {
  if (value === undefined || value === null) return "";
  return value.toString().trim();
};

export const normalizeRow = (row: Record<string, string>) => {
  const trimmed: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    trimmed[key.trim()] = trimValue(value);
  });
  return trimmed;
};

export const parseNumber = (value?: string | null): number | null => {
  if (value === undefined || value === null) return null;
  const cleaned = value
    .toString()
    .trim()
    .replace(/\(([^)]+)\)/g, "-$1")
    .replace(/[,$%]/g, "")
    .replace(/[^0-9.\-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBoolean = (value?: string | number | null): boolean | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value !== 0;
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return null;
  if (["y", "yes", "true", "1", "t"].includes(normalized)) return true;
  if (["n", "no", "false", "0", "f"].includes(normalized)) return false;
  if (normalized.includes("non") && normalized.includes("compliance")) return true;
  return null;
};

export const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    const part1 = Number.parseInt(match[1], 10);
    const part2 = Number.parseInt(match[2], 10);
    const year = Number.parseInt(match[3].length === 2 ? `20${match[3]}` : match[3], 10);

    const candidates = [
      { month: part1, day: part2 },
      { month: part2, day: part1 },
    ];

    for (const candidate of candidates) {
      if (candidate.month < 1 || candidate.month > 12) continue;
      if (candidate.day < 1 || candidate.day > 31) continue;
      const constructed = new Date(year, candidate.month - 1, candidate.day);
      if (!Number.isNaN(constructed.getTime())) return constructed;
    }
  }

  return null;
};

export const toTitleCase = (value?: string | null) => {
  if (!value) return "";
  return value
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatDate = (value?: Date | null) => {
  if (!value) return "";
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export const formatMonth = (value?: Date | null) => {
  if (!value) return "";
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
};

export const daysBetween = (start?: Date | null, end?: Date | null) => {
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
};

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
