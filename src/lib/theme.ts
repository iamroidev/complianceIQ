export const THEME_IDS = ["mist", "butter", "paper", "sand", "dark"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "mist";
export const THEME_STORAGE_KEY = "ciq-theme";
export const THEME_CHANGE_EVENT = "ciq-theme-change";

export const THEME_NAMES: Record<ThemeId, string> = {
  mist: "Mist blue",
  butter: "Butter",
  paper: "Warm paper",
  sand: "Sand",
  dark: "Dark",
};

/** Palette identity chips for the picker and toggle (mirrors tokens.css). */
export const THEME_SWATCHES: Record<
  ThemeId,
  { canvas: string; structure: string; accent: string }
> = {
  mist: { canvas: "#F2F5F9", structure: "#12263F", accent: "#D64045" },
  butter: { canvas: "#FEFAD4", structure: "#002B5B", accent: "#E63946" },
  paper: { canvas: "#FAF9F6", structure: "#1F3A5F", accent: "#C23B3B" },
  sand: { canvas: "#F6F1E9", structure: "#4A342A", accent: "#C0453B" },
  dark: { canvas: "#101214", structure: "#8FB1E3", accent: "#E63946" },
};

export function isThemeId(value: string | null): value is ThemeId {
  return value !== null && (THEME_IDS as readonly string[]).includes(value);
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  document.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function chooseTheme(id: ThemeId) {
  applyTheme(id);
  window.localStorage.setItem(THEME_STORAGE_KEY, id);
}

export function resolveTheme(): ThemeId {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (isThemeId(fromUrl)) return fromUrl;
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeId(saved)) return saved;
  return DEFAULT_THEME;
}

export function initTheme(): ThemeId {
  const pick = resolveTheme();
  applyTheme(pick);
  return pick;
}

/** Keeps every open tab in sync when another tab changes the theme. */
export function watchTheme(onChange: (id: ThemeId) => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY && isThemeId(e.newValue)) onChange(e.newValue);
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
