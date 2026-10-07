export const REDUCE_STORAGE_KEY = "ciq-reduce-motion";
export const REDUCE_CHANGE_EVENT = "ciq-reduce-motion-change";

export type ReduceChoice = "on" | "off";

/**
 * Precedence: ?motion= URL override > saved choice > OS preference.
 * The user choice overrides the OS setting in both directions (DESIGN §17).
 */
export function pickReduceMotion(params: {
  url: string | null;
  stored: string | null;
  system: boolean;
}): boolean {
  if (params.url === "reduce") return true;
  if (params.url === "full") return false;
  if (params.stored === "on") return true;
  if (params.stored === "off") return false;
  return params.system;
}

export function resolveReduceMotion(): boolean {
  return pickReduceMotion({
    url: new URLSearchParams(window.location.search).get("motion"),
    stored: window.localStorage.getItem(REDUCE_STORAGE_KEY),
    system: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
}

export function applyReduceMotion(on: boolean) {
  document.documentElement.dataset.reduceMotion = on ? "true" : "false";
  document.dispatchEvent(new Event(REDUCE_CHANGE_EVENT));
}

export function chooseReduceMotion(on: boolean) {
  applyReduceMotion(on);
  window.localStorage.setItem(REDUCE_STORAGE_KEY, on ? "on" : "off");
}

export function initReduceMotion(): boolean {
  const on = resolveReduceMotion();
  applyReduceMotion(on);
  return on;
}

/** Keeps every open tab in sync when another tab changes the choice. */
export function watchReduceMotion(onChange: (on: boolean) => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === REDUCE_STORAGE_KEY && (e.newValue === "on" || e.newValue === "off")) {
      onChange(e.newValue === "on");
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
