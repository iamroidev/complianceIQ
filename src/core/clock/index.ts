import { ISO_UTC_MS_PATTERN } from "../types/common";

/** Time source for the whole product — rules, ledger and snapshots all read it here. */
export interface Clock {
  now(): string;
}

export function isIsoUtcMs(value: unknown): value is string {
  return typeof value === "string" && ISO_UTC_MS_PATTERN.test(value);
}

export function assertIsoUtcMs(value: string, label: string): void {
  if (!isIsoUtcMs(value)) {
    throw new Error(`${label} must be ISO-8601 UTC ms, received "${value}"`);
  }
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

export const systemClock = new SystemClock();

/** Deterministic clock for tests, demos and time travel. */
export class FakeClock implements Clock {
  private current: string;

  constructor(initial: string) {
    assertIsoUtcMs(initial, "FakeClock initial time");
    this.current = initial;
  }

  now(): string {
    return this.current;
  }

  set(next: string): void {
    assertIsoUtcMs(next, "FakeClock.set time");
    this.current = next;
  }

  advance(milliseconds: number): void {
    if (!Number.isFinite(milliseconds)) {
      throw new Error(`FakeClock.advance expects a finite number, received ${milliseconds}`);
    }
    this.current = new Date(Date.parse(this.current) + milliseconds).toISOString();
  }

  advanceDays(days: number): void {
    this.advance(days * 86_400_000);
  }
}
