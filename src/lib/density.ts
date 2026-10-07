export const DENSITY_STORAGE_KEY = "ciq-density";
export const DENSITY_CHANGE_EVENT = "ciq-density-change";

export type Density = "comfortable" | "compact";

export const DENSITY_IDS: readonly Density[] = ["comfortable", "compact"];

export const DENSITY_NAMES: Record<Density, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
};

export const DENSITY_NOTE: Record<Density, string> = {
  comfortable: "40px rows, the default.",
  compact: "36px rows for reading a long list.",
};

export function isDensity(value: string | null): value is Density {
  return value !== null && (DENSITY_IDS as readonly string[]).includes(value);
}

export function applyDensity(density: Density) {
  document.documentElement.dataset.density = density;
  document.dispatchEvent(new Event(DENSITY_CHANGE_EVENT));
}

export function chooseDensity(density: Density) {
  applyDensity(density);
  window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
}

export function resolveDensity(): Density {
  const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
  return isDensity(saved) ? saved : "comfortable";
}

export function initDensity(): Density {
  const density = resolveDensity();
  applyDensity(density);
  return density;
}

/** Keeps every open tab in sync when another tab changes the density. */
export function watchDensity(onChange: (density: Density) => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === DENSITY_STORAGE_KEY && isDensity(e.newValue)) onChange(e.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
