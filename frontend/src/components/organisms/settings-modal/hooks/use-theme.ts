import { create } from "zustand";
import { Capacitor, registerPlugin } from "@capacitor/core";

export type ThemeMode = "dark" | "light";
export type ThemeSetting = "system" | "dark" | "light";

const THEME_SETTING_STORAGE_KEY = "weekbox_theme_setting";
const LEGACY_THEME_STORAGE_KEY = "weekbox_theme";

/**
 * Syncs native OS bars (Android status bar and navigation bar) and browser theme-color.
 */
export async function syncNativeTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  const isDark = theme === "dark";
  const color = isDark ? "#0e1415" : "#eff5f6";

  // Update HTML meta theme-color
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);

  // Update body background
  if (document.body) {
    document.body.style.backgroundColor = color;
  }

  // Update native Android system bars if running in Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      const AppManager = registerPlugin<any>("AppManager");
      await AppManager.setSystemTheme({ theme });
    } catch (e) {
      console.warn("Failed to set native system theme:", e);
    }
  }
}

/**
 * Helper to apply theme directly to document element and native layers.
 */
export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }
  syncNativeTheme(theme);
}

/**
 * Determines current OS system color theme.
 */
export function getSystemTheme(): ThemeMode {
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }
  return "dark";
}

/**
 * Resolves effective theme ("dark" | "light") from setting ("system" | "dark" | "light").
 */
export function resolveEffectiveTheme(setting: ThemeSetting): ThemeMode {
  if (setting === "system") {
    return getSystemTheme();
  }
  return setting;
}

/**
 * Reads initial theme setting from localStorage or defaults to "system".
 */
export function getInitialThemeSetting(): ThemeSetting {
  try {
    const savedSetting = localStorage.getItem(THEME_SETTING_STORAGE_KEY);
    if (savedSetting === "system" || savedSetting === "dark" || savedSetting === "light") {
      return savedSetting as ThemeSetting;
    }
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === "dark" || legacy === "light") {
      return legacy as ThemeSetting;
    }
  } catch {}
  return "system";
}

interface ThemeState {
  themeSetting: ThemeSetting;
  theme: ThemeMode;
  isUserDefined: boolean;
  setThemeSetting: (setting: ThemeSetting) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const initialSetting = getInitialThemeSetting();
const initialEffectiveTheme = resolveEffectiveTheme(initialSetting);

if (typeof document !== "undefined") {
  applyTheme(initialEffectiveTheme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeSetting: initialSetting,
  theme: initialEffectiveTheme,
  isUserDefined: initialSetting !== "system",
  setThemeSetting: (setting: ThemeSetting) => {
    const effective = resolveEffectiveTheme(setting);
    applyTheme(effective);
    try {
      localStorage.setItem(THEME_SETTING_STORAGE_KEY, setting);
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, effective);
    } catch (e) {
      console.warn("Could not save theme to localStorage:", e);
    }
    set({
      themeSetting: setting,
      theme: effective,
      isUserDefined: setting !== "system",
    });
  },
  setTheme: (newTheme: ThemeMode) => {
    get().setThemeSetting(newTheme);
  },
  toggleTheme: () => {
    const current = get().theme;
    const next = current === "dark" ? "light" : "dark";
    get().setThemeSetting(next);
  },
}));

// Setup OS system listener once globally
if (typeof window !== "undefined" && window.matchMedia) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const listener = (e: MediaQueryListEvent) => {
    const { themeSetting } = useThemeStore.getState();
    if (themeSetting === "system") {
      const sysTheme: ThemeMode = e.matches ? "light" : "dark";
      applyTheme(sysTheme);
      useThemeStore.setState({ theme: sysTheme });
    }
  };

  if (mq.addEventListener) {
    mq.addEventListener("change", listener);
  } else if ((mq as any).addListener) {
    (mq as any).addListener(listener);
  }
}

/**
 * Hook to manage theme switching (System / Dark / Light) with reactive persistence and native sync.
 */
export function useTheme() {
  const themeSetting = useThemeStore((state) => state.themeSetting);
  const theme = useThemeStore((state) => state.theme);
  const setThemeSetting = useThemeStore((state) => state.setThemeSetting);
  const setTheme = useThemeStore((state) => state.setTheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isUserDefined = useThemeStore((state) => state.isUserDefined);

  return {
    themeSetting,
    setThemeSetting,
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
    isUserDefined,
  };
}
