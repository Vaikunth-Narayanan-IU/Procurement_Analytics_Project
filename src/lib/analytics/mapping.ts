import { z } from "zod";
import type { CanonicalField, CanonicalPO, ColumnMapping } from "./types";
import { normalizeHeader, normalizeRow, parseBoolean, parseDate, parseNumber } from "./parsers";

export const CANONICAL_FIELDS: { key: CanonicalField; label: string; required?: boolean }[] = [
  { key: "po_id", label: "PO ID", required: true },
  { key: "supplier", label: "Supplier", required: true },
  { key: "po_date", label: "PO Date" },
  { key: "promised_delivery_date", label: "Promised Delivery Date" },
  { key: "actual_delivery_date", label: "Actual Delivery Date" },
  { key: "delivery_status", label: "Delivery Status" },
  { key: "defect_flag", label: "Defect Flag" },
  { key: "defect_count", label: "Defect Count" },
  { key: "compliance_flag", label: "Compliance Flag" },
  { key: "compliance_issue_type", label: "Compliance Issue Type" },
  { key: "partial_order_flag", label: "Partial Order Flag" },
  { key: "qty_ordered", label: "Qty Ordered" },
  { key: "qty_received", label: "Qty Received" },
  { key: "unit_price", label: "Unit Price" },
  { key: "total_cost", label: "Total Cost" },
  { key: "savings_amount", label: "Savings" },
  { key: "category", label: "Category" },
  { key: "region", label: "Region" },
];

export const defaultMapping: ColumnMapping = CANONICAL_FIELDS.reduce((acc, field) => {
  acc[field.key] = null;
  return acc;
}, {} as ColumnMapping);

const SUGGESTIONS: Record<CanonicalField, string[]> = {
  po_id: ["po id", "purchase order", "order id", "po#", "po number", "purchase_order_id", "po_id"],
  supplier: ["supplier", "vendor", "supplier name", "vendor name"],
  po_date: ["po date", "order date", "purchase date", "created date", "po_date", "order_date"],
  promised_delivery_date: [
    "promised delivery",
    "promise date",
    "expected delivery",
    "due date",
    "promised_delivery_date",
  ],
  actual_delivery_date: [
    "actual delivery",
    "delivered date",
    "receipt date",
    "arrival date",
    "actual_delivery_date",
    "delivery_date",
  ],
  delivery_status: ["delivery status", "on time", "status", "delivery_status", "order_status"],
  defect_flag: [
    "defect flag",
    "defect",
    "defective",
    "quality issue",
    "defect_flag",
    "defect_rate",
  ],
  defect_count: ["defect count", "defects", "defect qty", "defective_units"],
  compliance_flag: [
    "compliance flag",
    "compliance",
    "noncompliance",
    "violation",
    "compliance_flag",
    "policy_violation",
  ],
  compliance_issue_type: ["compliance issue", "issue type", "violation type"],
  partial_order_flag: ["partial order", "partial", "backorder", "short shipped", "partial_order_flag"],
  qty_ordered: ["qty ordered", "quantity ordered", "ordered qty", "order qty", "quantity_ordered", "quantity"],
  qty_received: ["qty received", "quantity received", "received qty", "receipt qty", "quantity_received"],
  unit_price: ["unit price", "price", "unit cost", "item price", "unit_price"],
  total_cost: [
    "total cost",
    "total spend",
    "total amount",
    "po total",
    "total_cost",
    "spend",
    "negotiated_price",
  ],
  savings_amount: ["savings", "savings amount", "savings_amount"],
  category: ["category", "commodity", "product category", "item_category"],
  region: ["region", "location", "site", "country"],
};

const KAGGLE_HEADER_MAP: Partial<Record<CanonicalField, string[]>> = {
  supplier: ["supplier"],
  category: ["category", "item_category"],
  po_id: ["purchase_order_id", "po_id"],
  po_date: ["po_date", "order_date"],
  promised_delivery_date: ["promised_delivery_date"],
  actual_delivery_date: ["actual_delivery_date", "delivery_date"],
  delivery_status: ["delivery_status", "order_status"],
  defect_flag: ["defect_flag", "defect_rate"],
  compliance_flag: ["compliance_flag", "policy_violation", "compliance"],
  qty_ordered: ["quantity_ordered", "quantity"],
  unit_price: ["unit_price"],
  total_cost: ["total_cost", "spend", "negotiated_price"],
  savings_amount: ["savings"],
  region: ["region"],
};

export const autoMapHeaders = (headers: string[], opts?: { preferKaggle?: boolean }):
  ColumnMapping => {
  const normalized = headers.map((header) => ({
    header,
    key: normalizeHeader(header),
  }));

  const mapping = { ...defaultMapping };

  const applySuggestions = (suggestionsMap: Record<CanonicalField, string[]>) => {
    CANONICAL_FIELDS.forEach(({ key }) => {
      const suggestions = suggestionsMap[key] || [];
      const match = normalized.find(({ key: headerKey }) =>
        suggestions.some((suggestion) => headerKey.includes(normalizeHeader(suggestion)))
      );
      if (match) {
        mapping[key] = match.header;
      }
    });
  };

  if (opts?.preferKaggle) {
    applySuggestions(SUGGESTIONS);
    applySuggestions(KAGGLE_HEADER_MAP as Record<CanonicalField, string[]>);
  } else {
    applySuggestions(KAGGLE_HEADER_MAP as Record<CanonicalField, string[]>);
    applySuggestions(SUGGESTIONS);
  }

  return mapping;
};

const CanonicalSchema = z.object({
  po_id: z.string().min(1).nullable(),
  supplier: z.string().min(1).nullable(),
  po_date: z.date().nullable().optional(),
  promised_delivery_date: z.date().nullable().optional(),
  actual_delivery_date: z.date().nullable().optional(),
  delivery_status: z.string().nullable().optional(),
  defect_flag: z.boolean().nullable().optional(),
  defect_count: z.number().nullable().optional(),
  compliance_flag: z.boolean().nullable().optional(),
  compliance_issue_type: z.string().nullable().optional(),
  partial_order_flag: z.boolean().nullable().optional(),
  qty_ordered: z.number().nullable().optional(),
  qty_received: z.number().nullable().optional(),
  unit_price: z.number().nullable().optional(),
  total_cost: z.number().nullable().optional(),
  savings_amount: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
});

const coerceText = (value?: string | null) => {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : null;
};

export const mapRowToCanonical = (
  row: Record<string, string>,
  mapping: ColumnMapping,
  index: number
): CanonicalPO => {
  const cleanedRow = normalizeRow(row);
  const poIdRaw = mapping.po_id ? cleanedRow[mapping.po_id] : "";
  const supplierRaw = mapping.supplier ? cleanedRow[mapping.supplier] : "";
  const po_id = (poIdRaw || "").toString().trim();
  const supplier = (supplierRaw || "Unknown Supplier").toString().trim() || "Unknown Supplier";

  const obj = {
    po_id: po_id || `row-${index + 1}`,
    supplier,
    po_date: parseDate(mapping.po_date ? cleanedRow[mapping.po_date] : undefined),
    promised_delivery_date: parseDate(
      mapping.promised_delivery_date ? cleanedRow[mapping.promised_delivery_date] : undefined
    ),
    actual_delivery_date: parseDate(
      mapping.actual_delivery_date ? cleanedRow[mapping.actual_delivery_date] : undefined
    ),
    delivery_status: coerceText(
      mapping.delivery_status ? cleanedRow[mapping.delivery_status] : undefined
    ),
    defect_flag: parseBoolean(mapping.defect_flag ? cleanedRow[mapping.defect_flag] : undefined),
    defect_count: parseNumber(mapping.defect_count ? cleanedRow[mapping.defect_count] : undefined),
    compliance_flag: parseBoolean(
      mapping.compliance_flag ? cleanedRow[mapping.compliance_flag] : undefined
    ),
    compliance_issue_type: coerceText(
      mapping.compliance_issue_type ? cleanedRow[mapping.compliance_issue_type] : undefined
    ),
    partial_order_flag: parseBoolean(
      mapping.partial_order_flag ? cleanedRow[mapping.partial_order_flag] : undefined
    ),
    qty_ordered: parseNumber(mapping.qty_ordered ? cleanedRow[mapping.qty_ordered] : undefined),
    qty_received: parseNumber(mapping.qty_received ? cleanedRow[mapping.qty_received] : undefined),
    unit_price: parseNumber(mapping.unit_price ? cleanedRow[mapping.unit_price] : undefined),
    total_cost: parseNumber(mapping.total_cost ? cleanedRow[mapping.total_cost] : undefined),
    savings_amount: parseNumber(
      mapping.savings_amount ? cleanedRow[mapping.savings_amount] : undefined
    ),
    category: coerceText(mapping.category ? cleanedRow[mapping.category] : undefined),
    region: coerceText(mapping.region ? cleanedRow[mapping.region] : undefined),
  } satisfies Omit<CanonicalPO, "source_row">;

  if (obj.total_cost === null || obj.total_cost === undefined) {
    const quantity = obj.qty_ordered ?? obj.qty_received ?? null;
    if (quantity !== null && obj.unit_price !== null && obj.unit_price !== undefined) {
      obj.total_cost = Number((quantity * obj.unit_price).toFixed(2));
    }
  }

  const parsed = CanonicalSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ...obj,
      supplier,
      source_row: cleanedRow,
    } satisfies CanonicalPO;
  }

  return {
    ...parsed.data,
    supplier,
    source_row: cleanedRow,
  } satisfies CanonicalPO;
};

export const mapRows = (rows: Record<string, string>[], mapping: ColumnMapping) => {
  return rows.map((row, index) => mapRowToCanonical(row, mapping, index));
};

export const detectKaggleDataset = (headers: string[], rowCount: number, source?: string) => {
  if (source === "/sample/procurement.csv") return true;
  if (rowCount < 600) return false;
  const normalized = headers.map((header) => normalizeHeader(header));
  const required = [
    "supplier",
    "category",
    "purchase order id",
    "po id",
    "po_date",
    "promised_delivery_date",
  ];
  return required.some((value) =>
    normalized.some((header) => header.includes(normalizeHeader(value)))
  );
};
