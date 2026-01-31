import type {
  CanonicalPO,
  MonthlyRiskPoint,
  SupplierIssue,
  SupplierMetric,
} from "./types";
import { clamp01, daysBetween } from "./parsers";

const getMonthKey = (date?: Date | null) => {
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const quantile = (values: number[], q: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

const buildOutlierModel = (values: number[]) => {
  if (values.length < 4) return null;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  if (iqr === 0) return null;
  return {
    lower: q1 - 1.5 * iqr,
    upper: q3 + 1.5 * iqr,
  };
};

export const flagPriceOutliers = (data: CanonicalPO[]) => {
  const globalValues: number[] = [];
  const groups: Record<string, number[]> = {};

  data.forEach((row) => {
    if (row.unit_price === null || row.unit_price === undefined) return;
    globalValues.push(row.unit_price);
    const monthKey = getMonthKey(row.po_date ?? row.promised_delivery_date ?? row.actual_delivery_date);
    if (row.category && monthKey) {
      const key = `${row.category}__${monthKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row.unit_price);
    }
  });

  const globalModel = buildOutlierModel(globalValues);
  const groupModels: Record<string, { lower: number; upper: number } | null> = {};
  Object.entries(groups).forEach(([key, values]) => {
    groupModels[key] = buildOutlierModel(values);
  });

  const outliers = new Set<string>();
  data.forEach((row) => {
    if (row.unit_price === null || row.unit_price === undefined) return;
    const monthKey = getMonthKey(row.po_date ?? row.promised_delivery_date ?? row.actual_delivery_date);
    const groupKey = row.category && monthKey ? `${row.category}__${monthKey}` : null;
    const model = (groupKey && groupModels[groupKey]) || globalModel;
    if (!model) return;
    if (row.unit_price < model.lower || row.unit_price > model.upper) {
      outliers.add(row.po_id);
    }
  });

  return outliers;
};

type SupplierAgg = SupplierMetric & {
  deliveries_with_dates: number;
  total_days_late_sum: number;
  on_time_count: number;
  on_time_denominator: number;
  missing_deliveries: number;
};

export const computeSupplierMetrics = (data: CanonicalPO[]) => {
  const outliers = flagPriceOutliers(data);
  const supplierMap = new Map<string, SupplierAgg>();

  data.forEach((row) => {
    const supplier = row.supplier || "Unknown Supplier";
    if (!supplierMap.has(supplier)) {
      supplierMap.set(supplier, {
        supplier,
        total_pos: 0,
        on_time_rate: 0,
        late_rate: 0,
        avg_days_late: 0,
        missing_delivery_rate: 0,
        defect_rate: 0,
        compliance_gap_rate: 0,
        partial_order_rate: 0,
        price_outlier_rate: 0,
        risk_score: 0,
        risk_band: "Low",
        late_deliveries: 0,
        defects: 0,
        compliance_gaps: 0,
        partial_orders: 0,
        spend: 0,
        deliveries_with_dates: 0,
        total_days_late_sum: 0,
        on_time_count: 0,
        on_time_denominator: 0,
        missing_deliveries: 0,
      });
    }
    const entry = supplierMap.get(supplier)!;
    entry.total_pos += 1;

    const hasPromise = !!row.promised_delivery_date;
    const hasActual = !!row.actual_delivery_date;
    const bothDates = hasPromise && hasActual;
    if (bothDates) {
      entry.deliveries_with_dates += 1;
      const daysLate = Math.max(
        0,
        (row.actual_delivery_date!.getTime() - row.promised_delivery_date!.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      entry.total_days_late_sum += daysLate;
      if (row.actual_delivery_date! > row.promised_delivery_date!) {
        entry.late_deliveries += 1;
      }
    }

    const status = row.delivery_status?.toLowerCase() || "";
    if (bothDates) {
      entry.on_time_denominator += 1;
      if (row.actual_delivery_date! <= row.promised_delivery_date!) {
        entry.on_time_count += 1;
      }
    } else if (status) {
      entry.on_time_denominator += 1;
      if (status.includes("late") || status.includes("delay") || status.includes("cancel")) {
        entry.late_deliveries += 1;
      }
      if (status.includes("on") && status.includes("time")) {
        entry.on_time_count += 1;
      } else if (status.includes("delivered") && !status.includes("late")) {
        entry.on_time_count += 1;
      }
    }

    if (!hasPromise || !hasActual) {
      entry.missing_deliveries += 1;
    }

    const defected =
      row.defect_flag === true ||
      (row.defect_count !== null && row.defect_count !== undefined && row.defect_count > 0);
    if (defected) entry.defects += 1;

    const complianceGap =
      row.compliance_flag === true ||
      (!!row.compliance_issue_type && row.compliance_issue_type.trim().length > 0);
    if (complianceGap) entry.compliance_gaps += 1;

    const partial =
      row.partial_order_flag === true ||
      (row.qty_received !== null &&
        row.qty_received !== undefined &&
        row.qty_ordered !== null &&
        row.qty_ordered !== undefined &&
        row.qty_received < row.qty_ordered);
    if (partial) entry.partial_orders += 1;

    if (outliers.has(row.po_id)) {
      entry.price_outlier_rate += 1;
    }

    if (row.total_cost !== null && row.total_cost !== undefined) {
      entry.spend += row.total_cost;
    }
  });

  const metrics = Array.from(supplierMap.values());
  const maxAvgDaysLate = Math.max(
    0,
    ...metrics.map((metric) =>
      metric.deliveries_with_dates ? metric.total_days_late_sum / metric.deliveries_with_dates : 0
    )
  );

  metrics.forEach((metric) => {
    const total = metric.total_pos || 1;
    const avgDaysLate = metric.deliveries_with_dates
      ? metric.total_days_late_sum / metric.deliveries_with_dates
      : 0;
    metric.avg_days_late = avgDaysLate;
    metric.late_rate = metric.deliveries_with_dates
      ? metric.late_deliveries / metric.deliveries_with_dates
      : 0;
    metric.missing_delivery_rate = metric.missing_deliveries / total;
    metric.defect_rate = metric.defects / total;
    metric.compliance_gap_rate = metric.compliance_gaps / total;
    metric.partial_order_rate = metric.partial_orders / total;
    metric.price_outlier_rate = metric.price_outlier_rate / total;
    metric.on_time_rate = metric.on_time_denominator
      ? metric.on_time_count / metric.on_time_denominator
      : 0;

    const normalizedAvgDaysLate = maxAvgDaysLate > 0 ? clamp01(avgDaysLate / maxAvgDaysLate) : 0;

    const weightedComponents: Array<{ weight: number; value: number; available: boolean }> = [
      { weight: 0.3, value: metric.late_rate, available: metric.deliveries_with_dates > 0 },
      { weight: 0.15, value: normalizedAvgDaysLate, available: metric.deliveries_with_dates > 0 },
      { weight: 0.1, value: metric.missing_delivery_rate, available: metric.missing_deliveries > 0 },
      { weight: 0.2, value: metric.defect_rate, available: metric.defects > 0 },
      { weight: 0.15, value: metric.compliance_gap_rate, available: metric.compliance_gaps > 0 },
      { weight: 0.05, value: metric.partial_order_rate, available: metric.partial_orders > 0 },
      { weight: 0.05, value: metric.price_outlier_rate, available: metric.price_outlier_rate > 0 },
    ];

    const availableComponents = weightedComponents.filter((component) => component.available);
    const totalWeight = availableComponents.reduce((acc, component) => acc + component.weight, 0);
    const weightedSum = availableComponents.reduce(
      (acc, component) => acc + component.value * component.weight,
      0
    );

    const normalizedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const score = 100 * normalizedScore;

    metric.risk_score = Number(score.toFixed(1));
    metric.risk_band = metric.risk_score >= 67 ? "High" : metric.risk_score >= 34 ? "Medium" : "Low";
  });

  return metrics.sort((a, b) => b.risk_score - a.risk_score);
};

export const computeMonthlyRiskTrend = (data: CanonicalPO[]): MonthlyRiskPoint[] => {
  const monthMap: Record<string, CanonicalPO[]> = {};
  data.forEach((row) => {
    const monthKey = getMonthKey(row.po_date ?? row.promised_delivery_date ?? row.actual_delivery_date);
    if (!monthKey) return;
    if (!monthMap[monthKey]) monthMap[monthKey] = [];
    monthMap[monthKey].push(row);
  });

  return Object.entries(monthMap)
    .map(([month, rows]) => {
      const metrics = computeSupplierMetrics(rows);
      if (!metrics.length) return { month, risk_score: 0 };
      const weighted = metrics.reduce((acc, metric) => acc + metric.risk_score * metric.total_pos, 0);
      const total = metrics.reduce((acc, metric) => acc + metric.total_pos, 0) || 1;
      return {
        month,
        risk_score: Number((weighted / total).toFixed(1)),
      };
    })
    .sort((a, b) => (a.month > b.month ? 1 : -1));
};

export const computeLateBySupplier = (data: CanonicalPO[]) => {
  const metrics = computeSupplierMetrics(data);
  return metrics.map((metric) => ({
    supplier: metric.supplier,
    late_deliveries: metric.late_deliveries,
  }));
};

export const computeDefectsBySupplier = (data: CanonicalPO[]) => {
  const metrics = computeSupplierMetrics(data);
  return metrics.map((metric) => ({
    supplier: metric.supplier,
    defects: metric.defects,
  }));
};

export const computeSpendVsRisk = (data: CanonicalPO[]) => {
  const metrics = computeSupplierMetrics(data);
  return metrics
    .filter((metric) => metric.spend > 0)
    .map((metric) => ({
      supplier: metric.supplier,
      risk_score: metric.risk_score,
      spend: Number(metric.spend.toFixed(2)),
    }));
};

export const computeOverallKPIs = (data: CanonicalPO[]) => {
  const total = data.length || 0;
  const metrics = computeSupplierMetrics(data);
  const avgOnTime = metrics.length
    ? metrics.reduce((acc, metric) => acc + metric.on_time_rate * metric.total_pos, 0) /
      metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
    : 0;

  const avgDaysLate = metrics.length
    ? metrics.reduce((acc, metric) => acc + metric.avg_days_late * metric.total_pos, 0) /
      metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
    : 0;

  const defectRate = metrics.length
    ? metrics.reduce((acc, metric) => acc + metric.defect_rate * metric.total_pos, 0) /
      metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
    : 0;

  const complianceRate = metrics.length
    ? metrics.reduce((acc, metric) => acc + metric.compliance_gap_rate * metric.total_pos, 0) /
      metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
    : 0;

  const partialRate = metrics.length
    ? metrics.reduce((acc, metric) => acc + metric.partial_order_rate * metric.total_pos, 0) /
      metrics.reduce((acc, metric) => acc + metric.total_pos, 0)
    : 0;

  return {
    total_pos: total,
    on_time_rate: avgOnTime,
    avg_days_late: avgDaysLate,
    defect_rate: defectRate,
    compliance_gap_rate: complianceRate,
    partial_order_rate: partialRate,
  };
};

export const buildTopIssues = (data: CanonicalPO[]): SupplierIssue[] => {
  const outliers = flagPriceOutliers(data);
  const issues: SupplierIssue[] = [];

  data.forEach((row) => {
    const daysLate = daysBetween(row.promised_delivery_date, row.actual_delivery_date);
    if (daysLate !== null && daysLate > 0) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Late",
        days_late: Number(daysLate.toFixed(1)),
        details: `Late by ${daysLate.toFixed(1)} days`,
      });
    }

    const defected =
      row.defect_flag === true ||
      (row.defect_count !== null && row.defect_count !== undefined && row.defect_count > 0);
    if (defected) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Defect",
        details:
          row.defect_count !== null && row.defect_count !== undefined
            ? `Defects: ${row.defect_count}`
            : "Defect flagged",
      });
    }

    const complianceGap =
      row.compliance_flag === true ||
      (!!row.compliance_issue_type && row.compliance_issue_type.trim().length > 0);
    if (complianceGap) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Compliance",
        details: row.compliance_issue_type || "Compliance gap",
      });
    }

    if (!row.promised_delivery_date || !row.actual_delivery_date) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Missing Dates",
        details: "Missing promised or actual date",
      });
    }

    const partial =
      row.partial_order_flag === true ||
      (row.qty_received !== null &&
        row.qty_received !== undefined &&
        row.qty_ordered !== null &&
        row.qty_ordered !== undefined &&
        row.qty_received < row.qty_ordered);
    if (partial) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Partial",
        details: "Partial order",
      });
    }

    if (outliers.has(row.po_id)) {
      issues.push({
        po_id: row.po_id,
        supplier: row.supplier,
        issue_type: "Price Outlier",
        details: "Unit price outlier",
      });
    }
  });

  return issues;
};

export const computeSupplierMonthlyRates = (data: CanonicalPO[], supplier: string) => {
  const rows = data.filter((row) => row.supplier === supplier);
  const monthMap: Record<string, CanonicalPO[]> = {};

  rows.forEach((row) => {
    const monthKey = getMonthKey(row.po_date ?? row.promised_delivery_date ?? row.actual_delivery_date);
    if (!monthKey) return;
    if (!monthMap[monthKey]) monthMap[monthKey] = [];
    monthMap[monthKey].push(row);
  });

  return Object.entries(monthMap)
    .map(([month, items]) => {
      const total = items.length || 1;
      const late = items.filter(
        (row) =>
          row.promised_delivery_date &&
          row.actual_delivery_date &&
          row.actual_delivery_date > row.promised_delivery_date
      ).length;
      const defect = items.filter(
        (row) =>
          row.defect_flag === true ||
          (row.defect_count !== null && row.defect_count !== undefined && row.defect_count > 0)
      ).length;
      const compliance = items.filter(
        (row) =>
          row.compliance_flag === true ||
          (!!row.compliance_issue_type && row.compliance_issue_type.trim().length > 0)
      ).length;

      return {
        month,
        late_rate: late / total,
        defect_rate: defect / total,
        compliance_gap_rate: compliance / total,
      };
    })
    .sort((a, b) => (a.month > b.month ? 1 : -1));
};

export const computeExceptions = (data: CanonicalPO[]) => {
  const outliers = flagPriceOutliers(data);

  const missingDates = data.filter(
    (row) => !row.promised_delivery_date || !row.actual_delivery_date
  );
  const compliance = data.filter(
    (row) =>
      row.compliance_flag === true ||
      (!!row.compliance_issue_type && row.compliance_issue_type.trim().length > 0)
  );
  const defects = data.filter(
    (row) =>
      row.defect_flag === true ||
      (row.defect_count !== null && row.defect_count !== undefined && row.defect_count > 0)
  );
  const partials = data.filter(
    (row) =>
      row.partial_order_flag === true ||
      (row.qty_received !== null &&
        row.qty_received !== undefined &&
        row.qty_ordered !== null &&
        row.qty_ordered !== undefined &&
        row.qty_received < row.qty_ordered)
  );
  const priceOutliers = data.filter((row) => outliers.has(row.po_id));

  return {
    missingDates,
    compliance,
    defects,
    partials,
    priceOutliers,
  };
};
