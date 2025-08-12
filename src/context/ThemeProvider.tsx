import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemePreference } from "@/types";
import { getTheme, setTheme } from "@/lib/storage";

type ThemeContextValue = {
  theme: ThemePreference;
  setThemePref: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useThemePreference(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemePreference must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getTheme());

  useEffect(() => {
    const root = document.documentElement;
    const systemPrefDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = theme === 'dark' || (theme === 'system' && systemPrefDark);
    root.classList.toggle('dark', shouldDark);
    setTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setThemePref: setThemeState,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}


