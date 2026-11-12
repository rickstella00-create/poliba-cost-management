const eurFormat = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurPreciseFormat = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kgFormat = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

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

export function dateIt(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
