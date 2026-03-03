import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "uf" | "epa" | "osu";

export const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  uf: "UF Gators",
  epa: "EPA",
  osu: "OSU Buckeyes",
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const THEME_ORDER: Theme[] = ["dark", "light", "uf", "epa", "osu"];

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", setTheme: () => {}, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-uf", "theme-epa", "theme-osu");
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "uf") {
    root.classList.add("dark", "theme-uf");
  } else if (theme === "epa") {
    root.classList.add("dark", "theme-epa");
  } else if (theme === "osu") {
    root.classList.add("dark", "theme-osu");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("swmm-theme") as Theme | null;
      if (stored && THEME_ORDER.includes(stored)) return stored;
    }
    return "dark";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("swmm-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
