import { assertIsoUtcMs } from "../clock";

/** Default cadence for scheduled checks — the demo cron runs every 5 minutes. */
export const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1_000;

export interface Scheduler {
  readonly intervalMs: number;
  readonly lastRunAt: string | null;
  /** A check is due when none has run yet, or the interval has elapsed. */
  isDue(now: string): boolean;
  /** Records that a check ran at `at`; time must not move backwards. */
  markRan(at: string): void;
  /** When the next scheduled run falls; a never-run scheduler is due immediately. */
  nextRunAt(now: string): string;
}

export interface SchedulerOptions {
  intervalMs?: number;
  lastRunAt?: string;
}

export function createScheduler(options: SchedulerOptions = {}): Scheduler {
  const intervalMs = options.intervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error(`Scheduler intervalMs must be a positive finite number, received ${intervalMs}`);
  }
  let lastRunAt: string | null = options.lastRunAt ?? null;
  if (lastRunAt !== null) assertIsoUtcMs(lastRunAt, "Scheduler lastRunAt");

  return {
    intervalMs,
    get lastRunAt() {
      return lastRunAt;
    },
    isDue(now) {
      assertIsoUtcMs(now, "Scheduler.isDue now");
      if (lastRunAt === null) return true;
      return Date.parse(now) - Date.parse(lastRunAt) >= intervalMs;
    },
    markRan(at) {
      assertIsoUtcMs(at, "Scheduler.markRan at");
      if (lastRunAt !== null && at < lastRunAt) {
        throw new Error(`Scheduler time moved backwards: ${at} < ${lastRunAt}`);
      }
      lastRunAt = at;
    },
    nextRunAt(now) {
      assertIsoUtcMs(now, "Scheduler.nextRunAt now");
      if (lastRunAt === null) return now;
      return new Date(Date.parse(lastRunAt) + intervalMs).toISOString();
    },
  };
}
