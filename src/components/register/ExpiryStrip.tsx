import { formatDay } from "@/lib/format";
import type { ExpiryState } from "@/lib/expiry";

const DAY_MS = 86_400_000;
const WINDOW_PAST_DAYS = 90;
const WINDOW_FUTURE_DAYS = 365;

export interface StripItem {
  label: string;
  /** Calendar expiry (YYYY-MM-DD); undefined = no expiry date. */
  date?: string;
  state: ExpiryState;
}

/**
 * The registers' visual anchor (DESIGN §15.2): a flat strip with one tick
 * per dated item showing when it expires against today (the vertical line).
 * Text alternative carries every date — the strip never replaces the words.
 */
export function ExpiryStrip({
  items,
  today,
  name,
}: {
  items: StripItem[];
  today: string;
  name: string;
}) {
  const todayMs = Date.parse(today.slice(0, 10));
  const from = todayMs - WINDOW_PAST_DAYS * DAY_MS;
  const span = (WINDOW_PAST_DAYS + WINDOW_FUTURE_DAYS) * DAY_MS;
  const at = (iso: string) =>
    Math.min(100, Math.max(0, ((Date.parse(iso) - from) / span) * 100));

  const dated = items.filter((item) => item.date);
  const described = items
    .map((item) =>
      item.date ? `${item.label} expires ${formatDay(item.date)}` : `${item.label} has no expiry date`,
    )
    .join("; ");

  return (
    <span
      className="strip"
      role="img"
      aria-label={`${name}: ${described || "nothing on file"}. Today is ${formatDay(today)}.`}
    >
      <span className="strip-line" />
      <span className="strip-today" style={{ left: `${at(today.slice(0, 10))}%` }} />
      {dated.map((item) => (
        <span
          key={`${item.label}_${item.date}`}
          className={`strip-tick is-${item.state}`}
          style={{ left: `${at(item.date!)}%` }}
          title={`${item.label}: ${formatDay(item.date!)}`}
        />
      ))}
    </span>
  );
}
