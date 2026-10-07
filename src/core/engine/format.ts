const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "9,800.00" — always two decimals for money. */
export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "10,000" for whole limits, "9,999.99" otherwise — matches the §7.1 summary style. */
export function formatLimit(amount: number): string {
  return Number.isInteger(amount)
    ? amount.toLocaleString("en-US")
    : formatUsd(amount);
}

/** "2026-03-12" for any ISO-8601 UTC ms string — dates are compared in UTC only. */
export function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

/** "12 Mar 2026" from a UTC day or ISO timestamp, built from UTC getters (no locale). */
export function formatUtcDate(iso: string): string {
  const day = utcDay(iso);
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

/** Whole days from one UTC day to another; positive when `toDay` is later. */
export function daysBetween(fromDay: string, toDay: string): number {
  const from = Date.parse(`${utcDay(fromDay)}T00:00:00.000Z`);
  const to = Date.parse(`${utcDay(toDay)}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${utcDay(day)}T00:00:00.000Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function article(noun: string): string {
  return /^[aeiou]/i.test(noun) ? "an" : "a";
}

export function hoursBetween(fromIso: string, toIso: string): number {
  return Math.round(((Date.parse(toIso) - Date.parse(fromIso)) / 3_600_000) * 10) / 10;
}
