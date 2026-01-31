export const formatPercent = (value: number, digits = 1) =>
  `${(value * 100).toFixed(digits)}%`;

export const formatNumber = (value: number, digits = 1) =>
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

export const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const buildHeaderHash = (headers: string[]) => {
  const raw = headers.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

export const toSupplierSlug = (name: string) => encodeURIComponent(name);
export const fromSupplierSlug = (slug: string) => decodeURIComponent(slug);
