export type CanonicalField =
  | "po_id"
  | "supplier"
  | "po_date"
  | "promised_delivery_date"
  | "actual_delivery_date"
  | "delivery_status"
  | "defect_flag"
  | "defect_count"
  | "compliance_flag"
  | "compliance_issue_type"
  | "partial_order_flag"
  | "qty_ordered"
  | "qty_received"
  | "unit_price"
  | "total_cost"
  | "savings_amount"
  | "category"
  | "region";

export type ColumnMapping = Record<CanonicalField, string | null>;

export type CanonicalPO = {
  po_id: string;
  supplier: string;
  po_date?: Date | null;
  promised_delivery_date?: Date | null;
  actual_delivery_date?: Date | null;
  delivery_status?: string | null;
  defect_flag?: boolean | null;
  defect_count?: number | null;
  compliance_flag?: boolean | null;
  compliance_issue_type?: string | null;
  partial_order_flag?: boolean | null;
  qty_ordered?: number | null;
  qty_received?: number | null;
  unit_price?: number | null;
  total_cost?: number | null;
  savings_amount?: number | null;
  category?: string | null;
  region?: string | null;
  source_row?: Record<string, string>;
};

export type SupplierMetric = {
  supplier: string;
  total_pos: number;
  on_time_rate: number;
  late_rate: number;
  avg_days_late: number;
  missing_delivery_rate: number;
  defect_rate: number;
  compliance_gap_rate: number;
  partial_order_rate: number;
  price_outlier_rate: number;
  risk_score: number;
  risk_band: "Low" | "Medium" | "High";
  late_deliveries: number;
  defects: number;
  compliance_gaps: number;
  partial_orders: number;
  spend: number;
};

export type MonthlyRiskPoint = {
  month: string;
  risk_score: number;
};

export type SupplierIssue = {
  po_id: string;
  supplier: string;
  issue_type: "Late" | "Defect" | "Compliance" | "Missing Dates" | "Partial" | "Price Outlier";
  days_late?: number;
  details?: string;
};

export type ExceptionRecord = {
  po_id: string;
  supplier: string;
  category?: string | null;
  region?: string | null;
  po_date?: Date | null;
  issue: string;
};
