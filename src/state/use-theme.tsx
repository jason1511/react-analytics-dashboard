import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeState = {
  isDark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

function getInitialDark(): boolean {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => getInitialDark());

  // Apply to <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Safety sync: if something else changed the class, reflect it
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const hasDark = root.classList.contains("dark");
      setIsDark(hasDark);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const value = useMemo(
    () => ({
      isDark,
      toggle: () => setIsDark((d) => !d),
      setDark: (v: boolean) => setIsDark(v),
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
