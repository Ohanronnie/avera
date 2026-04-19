import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "nativewind";

type ThemeMode = "light" | "dark";

type ThemeContextType = {
  colorScheme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  hydrated: boolean;
};

const THEME_STORAGE_KEY = "themeMode";

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [hydrated, setHydrated] = useState(false);
  const resolvedScheme: ThemeMode = colorScheme === "light" ? "light" : "dark";

  useEffect(() => {
    let mounted = true;

    const syncTheme = async () => {
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        const nextTheme: ThemeMode =
          storedTheme === "light" || storedTheme === "dark"
            ? storedTheme
            : "dark";

        setColorScheme(nextTheme);
      } catch (error) {
        setColorScheme("dark");
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    };

    syncTheme();

    return () => {
      mounted = false;
    };
  }, [setColorScheme]);

  const setTheme = async (mode: ThemeMode) => {
    setColorScheme(mode);
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
  };

  const toggleTheme = async () => {
    const nextTheme: ThemeMode = resolvedScheme === "dark" ? "light" : "dark";
    await setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      colorScheme: resolvedScheme,
      isDark: resolvedScheme === "dark",
      setTheme,
      toggleTheme,
      hydrated,
    }),
    [resolvedScheme, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
