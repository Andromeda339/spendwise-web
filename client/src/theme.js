import { useEffect, useState } from "react";
import { loadJSON, saveJSON } from "./storage";

const systemTheme = () => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

// Тема зберігається в localStorage; без вибору береться системна
export function useTheme() {
  const [theme, setTheme] = useState(() => loadJSON("sw.theme", systemTheme()));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveJSON("sw.theme", theme);
  }, [theme]);
  return [theme, () => setTheme(theme === "dark" ? "light" : "dark")];
}
