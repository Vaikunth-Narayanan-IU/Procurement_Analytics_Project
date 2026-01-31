"use client";

export default function Badge({ label, tone }: { label: string; tone?: "low" | "mid" | "high" }) {
  const tones: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    mid: "bg-amber-100 text-amber-800 border-amber-200",
    high: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        tones[tone ?? "low"]
      }`}
    >
      {label}
    </span>
  );
}
