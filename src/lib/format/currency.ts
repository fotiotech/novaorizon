// lib/format/currency.ts

/**
 * Format a price in Central African CFA francs (XAF).
 *
 * XAF has no decimal places, so values are rounded to the nearest whole
 * franc. Grouping uses the French convention — a narrow no-break space
 * between thousands — which is what Cameroonian users expect to see.
 *
 *   formatXAF(1500)      → "1 500 F CFA"
 *   formatXAF(125000)    → "125 000 F CFA"
 *   formatXAF(null)      → ""
 */
export function formatXAF(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n);
  const grouped = rounded.toLocaleString("fr-FR");
  return `${grouped} F CFA`;
}

/**
 * Short variant used where horizontal space is tight (variant cards,
 * inline badges). Drops the "CFA" suffix.
 *
 *   formatXAFShort(1500) → "1 500 F"
 */
export function formatXAFShort(
  amount: number | string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n).toLocaleString("fr-FR")} F`;
}

/**
 * Parse a price into a number, tolerating strings and skipping empty
 * values. Returns 0 for anything unparseable, matching the previous
 * behaviour in ProductDetailsClient.
 */
export function toPriceNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}
