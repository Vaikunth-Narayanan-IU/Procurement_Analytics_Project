import { CANONICAL_FIELDS } from "@/lib/analytics";

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-3xl font-semibold text-slate-900">About Supplier Risk Cockpit</h1>
        <p className="mt-2 text-sm text-slate-600">
          This cockpit ingests CSV procurement KPIs, lets you map columns to a canonical schema, and
          computes supplier risk using deterministic rules.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Canonical schema</h2>
        <p className="mt-2 text-sm text-slate-600">
          Only fields available in your CSV will be used; missing fields are safely ignored.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          {CANONICAL_FIELDS.map((field) => (
            <li key={field.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <span className="font-semibold">{field.label}</span>
              {field.required ? <span className="ml-2 text-xs text-rose-500">Required</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Risk score formula</h2>
        <p className="mt-2 text-sm text-slate-600">
          Supplier risk scores are deterministic and transparent. Each metric is normalized to 0–1
          before weighting.
        </p>
        <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-white">
          <pre className="whitespace-pre-wrap">
{`risk_score = 100 * (
  0.30*late_rate +
  0.15*normalize(avg_days_late) +
  0.10*missing_delivery_rate +
  0.20*defect_rate +
  0.15*compliance_gap_rate +
  0.05*partial_order_rate +
  0.05*price_outlier_rate
)`}
          </pre>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Risk bands: 0–33 Low · 34–66 Medium · 67–100 High.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-xl font-semibold text-rose-900">Disclaimers</h2>
        <ul className="mt-3 space-y-2 text-sm text-rose-800">
          <li>Data is processed in your browser; mappings are saved locally in localStorage.</li>
          <li>Compliance flags are treated as gaps/violations if marked true or if an issue type exists.</li>
          <li>Do not upload confidential data to public deployments.</li>
        </ul>
      </section>
    </div>
  );
}
