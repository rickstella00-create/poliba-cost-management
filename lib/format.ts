const eurFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurPreciseFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kgFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

export function eur(value: number | null | undefined, precise = false): string {
  return (precise ? eurPreciseFormat : eurFormat).format(Number(value ?? 0));
}

export function kg(value: number | null | undefined): string {
  return `${kgFormat.format(Number(value ?? 0))} kg`;
}

export function num(value: number | null | undefined): string {
  return numberFormat.format(Number(value ?? 0));
}

export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

export function dateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** The database stores the status as bozza/verificato: the interface shows it in English. */
export function statusLabel(status: string): string {
  return status === "verificato" ? "Verified" : "Draft";
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  // Accepts "12.50", "12,50" and numbers pasted from a spreadsheet such as
  // "1,250.50" or "1.250,50": the separator that comes last is the decimal one.
  let text = String(value).trim().replace(/\s/g, "").replace("€", "");
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else {
    text = text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}
